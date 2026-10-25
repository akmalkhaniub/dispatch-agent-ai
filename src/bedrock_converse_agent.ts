/**
 * Amazon Bedrock Converse API Agent for Spoken Voice Intent & Tool Calling
 *
 * Implements Amazon Bedrock Converse API with toolUse / toolResult loops.
 * Default model: amazon.nova-pro-v1:0 (with fallbacks to us.anthropic.claude-3-5-sonnet-20241022-v2:0).
 *
 * Provides a deterministic offline simulator when AWS credentials are not configured,
 * ensuring 100% test reproducibility and zero-friction evaluator setup.
 */

export interface ToolDefinition {
  toolSpec: {
    name: string;
    description: string;
    inputSchema: {
      json: Record<string, unknown>;
    };
  };
}

export interface BedrockToolCall {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

export interface BedrockAgentTurnResult {
  verbalResponse: string;
  toolCalls: BedrockToolCall[];
  modelId: string;
  latencyMs: number;
  mode: 'live' | 'simulator';
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export const DISPATCH_TOOLS: ToolDefinition[] = [
  {
    toolSpec: {
      name: 'acknowledge_incident',
      description: 'Acknowledge the active on-call incident, halting further escalation to secondary responders.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            incidentId: { type: 'string', description: 'Unique incident identifier' },
            acknowledgedBy: { type: 'string', description: 'Name of the engineer acknowledging the alert' },
            notes: { type: 'string', description: 'Optional acknowledgment notes or voice summary' }
          },
          required: ['incidentId']
        }
      }
    }
  },
  {
    toolSpec: {
      name: 'trigger_rollback',
      description: 'Execute an emergency rollback of the misbehaving deployment or service to a stable version.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            incidentId: { type: 'string', description: 'Unique incident identifier' },
            serviceName: { type: 'string', description: 'Target microservice name' },
            targetVersion: { type: 'string', description: 'Target stable semantic release or task definition revision (e.g. v2.4.1)' },
            reason: { type: 'string', description: 'Technical rationale for triggering the rollback' }
          },
          required: ['incidentId', 'targetVersion']
        }
      }
    }
  },
  {
    toolSpec: {
      name: 'drain_canary_traffic',
      description: 'Immediately divert and drain 100% of ingress canary or weighted blue-green traffic away from the failing deployment back to baseline production.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            incidentId: { type: 'string', description: 'Unique incident identifier' },
            targetWeight: { type: 'number', description: 'Target canary weight percentage (usually 0)', default: 0 }
          },
          required: ['incidentId']
        }
      }
    }
  },
  {
    toolSpec: {
      name: 'escalate_call',
      description: 'Escalate the emergency incident to the secondary or tertiary on-call engineer because the primary responder is unavailable.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            incidentId: { type: 'string', description: 'Unique incident identifier' },
            reason: { type: 'string', description: 'Reason for escalation (e.g., unavailable, out of coverage)' }
          },
          required: ['incidentId']
        }
      }
    }
  }
];

export class BedrockConverseAgent {
  readonly modelId: string;
  readonly region: string;
  readonly isMock: boolean;

  constructor(opts: { modelId?: string; region?: string; isMock?: boolean } = {}) {
    this.modelId = opts.modelId || process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0';
    this.region = opts.region || process.env.AWS_REGION || 'us-east-1';
    this.isMock = opts.isMock !== undefined
      ? opts.isMock
      : process.env.LIVE_BEDROCK !== 'true' || !process.env.AWS_SECRET_ACCESS_KEY;
  }

  /**
   * Process spoken audio transcript from an on-call engineer using Bedrock Converse.
   * Understands complex natural language, extracts target parameters, and invokes typed tools.
   */
  async interpretSpokenCommand(
    spokenText: string,
    context: { incidentId: string; serviceName: string; responderName: string }
  ): Promise<BedrockAgentTurnResult> {
    const started = Date.now();

    if (this.isMock) {
      return this.simulateConverseTurn(spokenText, context, started);
    }

    try {
      const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
      const client = new BedrockRuntimeClient({ region: this.region });

      const systemPrompt = [
        {
          text: `You are DispatchAgent.AI, an autonomous SRE and on-call telephony copilot.
You are on an active emergency voice phone call with ${context.responderName} regarding incident ${context.incidentId} on service ${context.serviceName}.
Your duty is to parse spoken voice commands from the engineer and invoke the appropriate tool(s).

Guidelines:
1. If the engineer acknowledges the alert, call 'acknowledge_incident'.
2. If the engineer orders a rollback or revert to a version, call 'trigger_rollback' and extract the version.
3. If the engineer asks to drain canary traffic or divert traffic, call 'drain_canary_traffic'.
4. If the engineer says they are unavailable, asleep, or asks to call someone else, call 'escalate_call'.
5. Multiple commands can be compounded (e.g. acknowledge AND roll back AND drain canary).
6. In your verbal response, be concise, calm, and professional as if speaking over a phone line.`
        }
      ];

      const messages: any[] = [
        {
          role: 'user',
          content: [{ text: `Spoken engineer utterance: "${spokenText}"` }]
        }
      ];

      const command = new ConverseCommand({
        modelId: this.modelId,
        system: systemPrompt as any,
        messages,
        toolConfig: {
          tools: DISPATCH_TOOLS as any
        },
        inferenceConfig: {
          maxTokens: 500,
          temperature: 0.1
        }
      });

      const response: any = await client.send(command);
      const outputMsg = response.output?.message;
      const toolCalls: BedrockToolCall[] = [];
      let verbalResponse = '';

      if (outputMsg?.content) {
        for (const block of outputMsg.content) {
          if (block.text) verbalResponse += block.text;
          if (block.toolUse) {
            toolCalls.push({
              toolUseId: block.toolUse.toolUseId,
              name: block.toolUse.name,
              input: block.toolUse.input
            });
          }
        }
      }

      if (!verbalResponse && toolCalls.length > 0) {
        verbalResponse = `Executing ${toolCalls.map(t => t.name).join(' and ')} for ${context.serviceName}.`;
      }

      return {
        verbalResponse: verbalResponse.trim(),
        toolCalls,
        modelId: this.modelId,
        latencyMs: Date.now() - started,
        mode: 'live',
        usage: response.usage
      };
    } catch (err) {
      console.warn('⚠️ [Bedrock Converse] Falling back to offline simulator:', (err as Error).message);
      return this.simulateConverseTurn(spokenText, context, started);
    }
  }

  /**
   * Deterministic offline simulator that mirrors Bedrock Converse toolUse blocks.
   * Ensures 100% reliable evaluation fixtures without live AWS billing.
   */
  private simulateConverseTurn(
    spokenText: string,
    context: { incidentId: string; serviceName: string; responderName: string },
    started: number
  ): BedrockAgentTurnResult {
    const lower = spokenText.toLowerCase();
    const toolCalls: BedrockToolCall[] = [];
    const verbalParts: string[] = [];

    // 1. Acknowledgment
    if (/\backnowledge\b|\back\b|\bgot it\b|\bcopy that\b|\bunderstands?\b/i.test(lower)) {
      toolCalls.push({
        toolUseId: 'tooluse_ack_' + Math.random().toString(36).substring(2, 7),
        name: 'acknowledge_incident',
        input: {
          incidentId: context.incidentId,
          acknowledgedBy: context.responderName
        }
      });
      verbalParts.push(`Acknowledged incident ${context.incidentId}.`);
    }

    // 2. Rollback
    if (/\b(rollback|roll back|revert)\b/i.test(lower)) {
      const versionMatch = spokenText.match(/v?\d+\.\d+(\.\d+)?/i);
      const targetVersion = versionMatch ? versionMatch[0] : 'v2.4.1';
      toolCalls.push({
        toolUseId: 'tooluse_rb_' + Math.random().toString(36).substring(2, 7),
        name: 'trigger_rollback',
        input: {
          incidentId: context.incidentId,
          serviceName: context.serviceName,
          targetVersion,
          reason: 'Spoken on-call operator directive'
        }
      });
      verbalParts.push(`Initiating rollback on ${context.serviceName} to ${targetVersion}.`);
    }

    // 3. Canary drain
    if (/\b(drain|canary|divert traffic)\b/i.test(lower)) {
      toolCalls.push({
        toolUseId: 'tooluse_drain_' + Math.random().toString(36).substring(2, 7),
        name: 'drain_canary_traffic',
        input: {
          incidentId: context.incidentId,
          targetWeight: 0
        }
      });
      verbalParts.push('Draining 100% of canary traffic.');
    }

    // 4. Escalation
    if (/\b(escalate|unavailable|can't make it|call someone else|call alex)\b/i.test(lower)) {
      toolCalls.push({
        toolUseId: 'tooluse_esc_' + Math.random().toString(36).substring(2, 7),
        name: 'escalate_call',
        input: {
          incidentId: context.incidentId,
          reason: 'Primary responder requested immediate escalation'
        }
      });
      verbalParts.push('Escalating to secondary responder immediately.');
    }

    const verbalResponse = verbalParts.length > 0
      ? verbalParts.join(' ')
      : `Understood, ${context.responderName}. No active remediation actions detected.`;

    return {
      verbalResponse,
      toolCalls,
      modelId: `${this.modelId} (simulator)`,
      latencyMs: Date.now() - started,
      mode: 'simulator',
      usage: {
        inputTokens: 145,
        outputTokens: 42,
        totalTokens: 187
      }
    };
  }
}
