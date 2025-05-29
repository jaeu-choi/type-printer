export interface PrintOptions {
  expanded?: boolean;
  verbose?: boolean;
  final?: boolean;
  format?: "tree" | "compact" | "expanded";
  maxDepth?: number;
}

export enum AnalyzableKind {
  TYPEALIAS = "TYPEALIAS",
  INTERFACE = "INTERFACE",
  VARIABLE = "VARIABLE",
  FUNCTION = "FUNCTION",
  UNKNOWN = "UNKNOWN",
  ENUM = "ENUM",
  CLASS = "CLASS",
}

export interface TypeStructure {
  type:
    | "primitive"
    | "union"
    | "intersection"
    | "array"
    | "reference"
    | "literal"
    | "object"
    | "operator"
    | "access"
    | "conditional"
    | "mapped"
    | "template";
  name?: string;
  value?: string;
  children?: TypeStructure[];
  properties?: ObjectProperty[];
  metadata?: {
    isBuiltin?: boolean;
    typeArgs?: string[];
    originalText?: string;
    operator?: string;
    condition?: string;
    referencePath?: string[];
    originalTypeName?: string;
    [key: string]: any;
  };
}

export interface ObjectProperty {
  name: string;
  type: TypeStructure;
  optional?: boolean;
  readonly?: boolean;
}

export interface TypeInfo {
  kind: AnalyzableKind;
  name: string;
  originalSource: string;
  structure: TypeStructure;
}

export interface TypeCollectionContext {
  checker: import("typescript").TypeChecker;
  program: import("typescript").Program;
  depth: number;
  maxDepth: number;
  referencePath: string[];
  genericContext?: Map<string, TypeStructure>;
  isInstantiated: boolean;
  sourceFile: import("typescript").SourceFile;
}

export interface TypeHandler {
  canHandle(node: import("typescript").TypeNode): boolean;
  handle(node: import("typescript").TypeNode, context: TypeCollectionContext): TypeStructure;
}