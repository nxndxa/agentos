/**
 * The single command registry. Every AgentOS capability is defined here once and
 * becomes callable from the CLI, MCP server, HTTP API, Capy and iMessage gateway.
 */

export type Permission = "read" | "write" | "execute";

export type ParameterType = "string" | "number" | "boolean" | "date";

export interface Parameter {
  name: string;
  type: ParameterType;
  description?: string;
  required?: boolean;
}

export interface CommandContext {
  /** Interface that issued the call: "cli", "qoder", "mcp", "imessage", "cron". */
  caller: string;
  args: Record<string, unknown>;
}

export type CommandHandler = (context: CommandContext) => Promise<unknown>;

export interface AgentCommand {
  /** Dotted resource.action form, e.g. "customer.get". */
  name: string;
  description: string;
  parameters: Parameter[];
  permission: Permission;
  handler: CommandHandler;
}

export class CommandRegistry {
  private readonly commands = new Map<string, AgentCommand>();

  register(command: AgentCommand): void {
    if (this.commands.has(command.name)) {
      throw new Error(`command already registered: ${command.name}`);
    }
    this.commands.set(command.name, command);
  }

  get(name: string): AgentCommand | undefined {
    return this.commands.get(name);
  }

  list(): AgentCommand[] {
    return [...this.commands.values()];
  }
}
