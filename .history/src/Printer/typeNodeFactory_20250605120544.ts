// src/typeNodeFactory.ts

import {
  TypeNode,
  TypeNodeKind,
  ObjectMember,
  ConditionalTypeInfo,
  TemplateLiteralTypeInfo,
  IndexAccessTypeInfo,
  FunctionTypeInfo,
  MappingTypeInfo,
  FunctionParameter,
  IterationStepNode,
  IntermediateStep,
  TypeNodeMetadata,
  TypeCreationContext,
  TypeNodeFactory as ITypeNodeFactory,
  TypeNodeUtils as ITypeNodeUtils,
} from "./ir";

/**
 * 🏭 TypeNode 생성 팩토리 - IR 객체를 쉽게 생성하는 헬퍼들
 */
export class TypeNodeFactory implements ITypeNodeFactory {
  /**
   * 원시 타입 노드 생성
   */
  createPrimitive(
    literal: string,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    return {
      kind: "primitive",
      literal,
      metadata: {
        originalText: literal,
        finalTypeString: literal,
        isBuiltin: true,
        complexity: {
          level: "simple",
          score: 1,
          factors: ["primitive"],
        },
        ...metadata,
      },
    };
  }

  /**
   * 리터럴 타입 노드 생성
   */
  createLiteral(value: string, metadata?: Partial<TypeNodeMetadata>): TypeNode {
    return {
      kind: "literal",
      literal: value,
      metadata: {
        originalText: value,
        finalTypeString: value,
        complexity: {
          level: "simple",
          score: 1,
          factors: ["literal"],
        },
        ...metadata,
      },
    };
  }

  /**
   * 참조 타입 노드 생성
   */
  createReference(
    name: string,
    typeArgs?: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const hasTypeArgs = typeArgs && typeArgs.length > 0;
    const complexity = this.calculateReferenceComplexity(name, typeArgs);

    return {
      kind: "reference",
      name,
      typeArguments: typeArgs,
      metadata: {
        originalText: hasTypeArgs
          ? `${name}<${typeArgs!
              .map((arg) => arg.literal || arg.name || "unknown")
              .join(", ")}>`
          : name,
        finalTypeString: name,
        isBuiltin: this.isBuiltinType(name),
        genericInfo: hasTypeArgs
          ? {
              isGeneric: true,
              isInstantiated: true,
              typeParameters: typeArgs!.map(
                (arg) => arg.name || arg.literal || "unknown"
              ),
              resolvedArguments: typeArgs!.map(
                (arg) => arg.metadata?.finalTypeString || "unknown"
              ),
            }
          : undefined,
        complexity,
        ...metadata,
      },
    };
  }

  /**
   * 유니온 타입 노드 생성
   */
  createUnion(
    members: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const complexity = this.calculateUnionComplexity(members);

    return {
      kind: "union",
      children: members,
      metadata: {
        originalText: members
          .map((m) => m.literal || m.name || "unknown")
          .join(" | "),
        finalTypeString: members
          .map((m) => m.metadata?.finalTypeString || "unknown")
          .join(" | "),
        complexity,
        ...metadata,
      },
    };
  }

  /**
   * 교집합 타입 노드 생성
   */
  createIntersection(
    members: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const complexity = this.calculateIntersectionComplexity(members);

    return {
      kind: "intersection",
      children: members,
      metadata: {
        originalText: members
          .map((m) => m.literal || m.name || "unknown")
          .join(" & "),
        finalTypeString: members
          .map((m) => m.metadata?.finalTypeString || "unknown")
          .join(" & "),
        complexity,
        ...metadata,
      },
    };
  }

  /**
   * 배열 타입 노드 생성
   */
  createArray(
    elementType: TypeNode,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const elementComplexity = elementType.metadata?.complexity?.score || 1;

    return {
      kind: "array",
      elementType,
      children: [elementType],
      metadata: {
        originalText: `${
          elementType.literal || elementType.name || "unknown"
        }[]`,
        finalTypeString: `${
          elementType.metadata?.finalTypeString || "unknown"
        }[]`,
        complexity: {
          level: elementComplexity > 3 ? "medium" : "simple",
          score: elementComplexity + 1,
          factors: [
            "array",
            ...(elementType.metadata?.complexity?.factors || []),
          ],
        },
        ...metadata,
      },
    };
  }

  /**
   * 객체 타입 노드 생성
   */
  createObject(
    members: ObjectMember[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const complexity = this.calculateObjectComplexity(members);

    return {
      kind: "object",
      objectMembers: members,
      metadata: {
        originalText: `{ ${members
          .map((m) => `${m.key}: ${m.node.literal || m.node.name || "unknown"}`)
          .join("; ")} }`,
        finalTypeString: `{ ${members
          .map(
            (m) => `${m.key}: ${m.node.metadata?.finalTypeString || "unknown"}`
          )
          .join("; ")} }`,
        complexity,
        ...metadata,
      },
    };
  }

  /**
   * 함수 타입 노드 생성
   */
  createFunction(
    parameters: FunctionParameter[],
    returnType: TypeNode,
    typeParameters?: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const functionInfo: FunctionTypeInfo = {
      parameters,
      returnType,
      typeParameters,
      signature: this.generateFunctionSignature(
        parameters,
        returnType,
        typeParameters
      ),
    };

    const complexity = this.calculateFunctionComplexity(
      parameters,
      returnType,
      typeParameters
    );

    return {
      kind: "function",
      functionInfo,
      children: [returnType, ...parameters.map((p) => p.type)],
      metadata: {
        originalText: functionInfo.signature,
        finalTypeString: functionInfo.signature,
        complexity,
        ...metadata,
      },
    };
  }

  /**
   * 조건부 타입 노드 생성
   */
  createConditional(
    info: ConditionalTypeInfo,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const complexity = this.calculateConditionalComplexity(info);

    return {
      kind: "conditional",
      conditionalInfo: info,
      children: [
        info.checkType,
        info.extendsType,
        info.trueType,
        info.falseType,
      ],
      metadata: {
        originalText: `${info.checkType.name || "T"} extends ${
          info.extendsType.name || "U"
        } ? ${info.trueType.name || "X"} : ${info.falseType.name || "Y"}`,
        finalTypeString:
          info.resolved !== undefined
            ? (info.resolved
                ? info.trueType.metadata?.finalTypeString
                : info.falseType.metadata?.finalTypeString) || "unknown"
            : "conditional",
        complexity,
        analysisMethod: "type-checker",
        ...metadata,
      },
    };
  }

  /**
   * 매핑 타입 노드 생성
   */
  createMapped(
    info: MappingTypeInfo,
    iterations?: IterationStepNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const complexity = this.calculateMappedComplexity(info, iterations);

    return {
      kind: "mapped",
      mappingInfo: info,
      iterationSteps: iterations,
      children: [info.constraint, info.valueExpression],
      metadata: {
        originalText: `{ [${info.iteratorVar} in ${
          info.constraint.name || "keyof T"
        }]: ${info.valueExpression.name || "T[K]"} }`,
        finalTypeString: iterations ? "mapped-result" : "mapped",
        complexity,
        analysisMethod: iterations ? "reverse-engineering" : "ast-parsing",
        ...metadata,
      },
    };
  }

  /**
   * 템플릿 리터럴 타입 노드 생성
   */
  createTemplate(
    parts: TypeNode[],
    resolvedString?: string,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const templateInfo: TemplateLiteralTypeInfo = {
      parts,
      resolvedString,
    };

    const complexity = this.calculateTemplateComplexity(parts);

    return {
      kind: "template",
      templateLiteralInfo: templateInfo,
      children: parts,
      metadata: {
        originalText: `\`${parts
          .map((p) => "${" + (p.name || p.literal || "unknown") + "}")
          .join("")}\``,
        finalTypeString: resolvedString || "template-literal",
        complexity,
        ...metadata,
      },
    };
  }

  /**
   * 인덱스 액세스 타입 노드 생성
   */
  createIndexAccess(
    objectType: TypeNode,
    indexType: TypeNode,
    resolvedType?: TypeNode,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    const indexAccessInfo: IndexAccessTypeInfo = {
      objectType,
      indexType,
      resolvedType: resolvedType || this.createPrimitive("unknown"),
    };

    const complexity = this.calculateIndexAccessComplexity(
      objectType,
      indexType
    );

    return {
      kind: "indexAccess",
      indexAccessInfo,
      children: [objectType, indexType],
      metadata: {
        originalText: `${objectType.name || "T"}[${
          indexType.literal || indexType.name || "K"
        }]`,
        finalTypeString: resolvedType?.metadata?.finalTypeString || "unknown",
        complexity,
        ...metadata,
      },
    };
  }

  /**
   * 연산자 타입 노드 생성 (keyof, typeof 등)
   */
  createOperator(
    operator: string,
    operand: TypeNode,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    return {
      kind: "operator",
      name: operator,
      children: [operand],
      metadata: {
        originalText: `${operator} ${operand.name || operand.literal || "T"}`,
        finalTypeString: `${operator}-result`,
        complexity: {
          level: "simple",
          score: 2,
          factors: ["operator", operator],
        },
        ...metadata,
      },
    };
  }

  // === 🔧 복잡도 계산 헬퍼들 ===

  private calculateReferenceComplexity(name: string, typeArgs?: TypeNode[]) {
    const base = this.isBuiltinType(name) ? 1 : 2;
    const argsComplexity =
      typeArgs?.reduce(
        (sum, arg) => sum + (arg.metadata?.complexity?.score || 1),
        0
      ) || 0;
    const score = base + argsComplexity;

    return {
      level: score > 5 ? "complex" : score > 2 ? "medium" : ("simple" as const),
      score,
      factors: [
        "reference",
        ...(typeArgs ? ["generic"] : []),
        ...(typeArgs?.flatMap(
          (arg) => arg.metadata?.complexity?.factors || []
        ) || []),
      ],
    };
  }

  private calculateUnionComplexity(members: TypeNode[]) {
    const memberComplexity = members.reduce(
      (sum, member) => sum + (member.metadata?.complexity?.score || 1),
      0
    );
    const score = memberComplexity + members.length;

    return {
      level: score > 8 ? "complex" : score > 4 ? "medium" : ("simple" as const),
      score,
      factors: [
        "union",
        `${members.length}-members`,
        ...members.flatMap((m) => m.metadata?.complexity?.factors || []),
      ],
    };
  }

  private calculateIntersectionComplexity(members: TypeNode[]) {
    const memberComplexity = members.reduce(
      (sum, member) => sum + (member.metadata?.complexity?.score || 1),
      0
    );
    const score = memberComplexity + members.length * 1.5; // 교집합이 유니온보다 약간 더 복잡

    return {
      level: score > 8 ? "complex" : score > 4 ? "medium" : ("simple" as const),
      score,
      factors: [
        "intersection",
        `${members.length}-members`,
        ...members.flatMap((m) => m.metadata?.complexity?.factors || []),
      ],
    };
  }

  private calculateObjectComplexity(members: ObjectMember[]) {
    const memberComplexity = members.reduce(
      (sum, member) => sum + (member.node.metadata?.complexity?.score || 1),
      0
    );
    const score = memberComplexity + members.length;

    return {
      level:
        score > 10 ? "complex" : score > 5 ? "medium" : ("simple" as const),
      score,
      factors: [
        "object",
        `${members.length}-properties`,
        ...members.flatMap((m) => m.node.metadata?.complexity?.factors || []),
      ],
    };
  }

  private calculateFunctionComplexity(
    parameters: FunctionParameter[],
    returnType: TypeNode,
    typeParameters?: TypeNode[]
  ) {
    const paramComplexity = parameters.reduce(
      (sum, param) => sum + (param.type.metadata?.complexity?.score || 1),
      0
    );
    const returnComplexity = returnType.metadata?.complexity?.score || 1;
    const typeParamComplexity =
      typeParameters?.reduce(
        (sum, tp) => sum + (tp.metadata?.complexity?.score || 1),
        0
      ) || 0;
    const score = paramComplexity + returnComplexity + typeParamComplexity + 2;

    return {
      level: score > 8 ? "complex" : score > 4 ? "medium" : ("simple" as const),
      score,
      factors: [
        "function",
        `${parameters.length}-params`,
        ...(typeParameters ? ["generic"] : []),
        ...(returnType.metadata?.complexity?.factors || []),
      ],
    };
  }

  private calculateConditionalComplexity(info: ConditionalTypeInfo) {
    const checkComplexity = info.checkType.metadata?.complexity?.score || 1;
    const extendsComplexity = info.extendsType.metadata?.complexity?.score || 1;
    const trueComplexity = info.trueType.metadata?.complexity?.score || 1;
    const falseComplexity = info.falseType.metadata?.complexity?.score || 1;
    const score =
      checkComplexity +
      extendsComplexity +
      trueComplexity +
      falseComplexity +
      3;

    return {
      level:
        score > 10 ? "complex" : score > 6 ? "medium" : ("simple" as const),
      score,
      factors: [
        "conditional",
        "branching",
        ...(info.checkType.metadata?.complexity?.factors || []),
      ],
    };
  }

  private calculateMappedComplexity(
    info: MappingTypeInfo,
    iterations?: IterationStepNode[]
  ) {
    const constraintComplexity =
      info.constraint.metadata?.complexity?.score || 1;
    const valueComplexity =
      info.valueExpression.metadata?.complexity?.score || 1;
    const iterationComplexity = iterations ? iterations.length * 2 : 0;
    const nestedComplexity =
      iterations?.reduce(
        (sum, iter) => sum + (iter.nestedMapping?.innerSteps?.length || 0),
        0
      ) || 0;
    const score =
      constraintComplexity +
      valueComplexity +
      iterationComplexity +
      nestedComplexity +
      4;

    return {
      level:
        score > 15
          ? "extreme"
          : score > 10
          ? "complex"
          : score > 6
          ? "medium"
          : ("simple" as const),
      score,
      factors: [
        "mapped",
        "iteration",
        ...(iterations ? [`${iterations.length}-steps`] : []),
        ...(nestedComplexity > 0 ? ["nested"] : []),
        ...(info.constraint.metadata?.complexity?.factors || []),
      ],
    };
  }

  private calculateTemplateComplexity(parts: TypeNode[]) {
    const partComplexity = parts.reduce(
      (sum, part) => sum + (part.metadata?.complexity?.score || 1),
      0
    );
    const score = partComplexity + parts.length + 1;

    return {
      level: score > 8 ? "complex" : score > 4 ? "medium" : ("simple" as const),
      score,
      factors: [
        "template",
        `${parts.length}-parts`,
        ...parts.flatMap((p) => p.metadata?.complexity?.factors || []),
      ],
    };
  }

  private calculateIndexAccessComplexity(
    objectType: TypeNode,
    indexType: TypeNode
  ) {
    const objectComplexity = objectType.metadata?.complexity?.score || 1;
    const indexComplexity = indexType.metadata?.complexity?.score || 1;
    const score = objectComplexity + indexComplexity + 1;

    return {
      level: score > 6 ? "complex" : score > 3 ? "medium" : ("simple" as const),
      score,
      factors: [
        "index-access",
        ...(objectType.metadata?.complexity?.factors || []),
        ...(indexType.metadata?.complexity?.factors || []),
      ],
    };
  }

  // === 🔧 기타 헬퍼들 ===

  private isBuiltinType(name: string): boolean {
    const builtinTypes = [
      "string",
      "number",
      "boolean",
      "object",
      "undefined",
      "null",
      "void",
      "any",
      "unknown",
      "never",
      "Array",
      "Promise",
      "Record",
      "Pick",
      "Omit",
      "Partial",
      "Required",
      "Readonly",
      "Extract",
      "Exclude",
      "NonNullable",
      "ReturnType",
      "Parameters",
    ];
    return builtinTypes.includes(name);
  }

  private generateFunctionSignature(
    parameters: FunctionParameter[],
    returnType: TypeNode,
    typeParameters?: TypeNode[]
  ): string {
    const typeParamsStr =
      typeParameters && typeParameters.length > 0
        ? `<${typeParameters.map((tp) => tp.name || "T").join(", ")}>`
        : "";

    const paramsStr = parameters
      .map((p) => {
        const optional = p.optional ? "?" : "";
        const rest = p.rest ? "..." : "";
        return `${rest}${p.name}${optional}: ${
          p.type.metadata?.finalTypeString || p.type.name || "unknown"
        }`;
      })
      .join(", ");

    const returnStr =
      returnType.metadata?.finalTypeString || returnType.name || "unknown";

    return `${typeParamsStr}(${paramsStr}) => ${returnStr}`;
  }
}

/**
 * 🛠️ TypeNode 유틸리티 클래스
 */
export class TypeNodeUtils implements ITypeNodeUtils {
  /**
   * 타입 노드가 특정 종류인지 확인
   */
  isKind(node: TypeNode, kind: TypeNodeKind): boolean {
    return node.kind === kind;
  }

  /**
   * 타입 노드의 복잡도 계산
   */
  calculateComplexity(node: TypeNode): number {
    if (node.metadata?.complexity?.score) {
      return node.metadata.complexity.score;
    }

    // 기본 복잡도 계산
    let score = 1;

    if (node.children) {
      score += node.children.reduce(
        (sum, child) => sum + this.calculateComplexity(child),
        0
      );
    }

    if (node.typeArguments) {
      score += node.typeArguments.reduce(
        (sum, arg) => sum + this.calculateComplexity(arg),
        0
      );
    }

    if (node.iterationSteps) {
      score += node.iterationSteps.length * 2;
    }

    return score;
  }

  /**
   * 타입 노드를 간단한 문자열로 변환
   */
  stringify(node: TypeNode): string {
    if (node.metadata?.finalTypeString) {
      return node.metadata.finalTypeString;
    }

    switch (node.kind) {
      case "primitive":
      case "literal":
        return node.literal || "unknown";
      case "reference":
        return node.name || "unknown";
      case "union":
        return (
          node.children?.map((c) => this.stringify(c)).join(" | ") || "union"
        );
      case "intersection":
        return (
          node.children?.map((c) => this.stringify(c)).join(" & ") ||
          "intersection"
        );
      case "array":
        return node.elementType
          ? `${this.stringify(node.elementType)}[]`
          : "array";
      case "object":
        return node.objectMembers
          ? `{ ${node.objectMembers
              .map((m) => `${m.key}: ${this.stringify(m.node)}`)
              .join("; ")} }`
          : "object";
      default:
        return node.kind;
    }
  }

  /**
   * 타입 노드 깊은 복사
   */
  clone(node: TypeNode): TypeNode {
    return JSON.parse(JSON.stringify(node));
  }

  /**
   * 타입 노드 비교 (얕은 비교)
   */
  equals(a: TypeNode, b: TypeNode): boolean {
    if (a.kind !== b.kind) return false;
    if (a.name !== b.name) return false;
    if (a.literal !== b.literal) return false;

    // 더 정교한 비교는 필요에 따라 구현
    return true;
  }

  /**
   * 메타데이터 병합
   */
  mergeMetadata(
    target: TypeNodeMetadata,
    source: TypeNodeMetadata
  ): TypeNodeMetadata {
    return {
      ...target,
      ...source,
      complexity: source.complexity || target.complexity,
      genericInfo: source.genericInfo || target.genericInfo,
      debug: {
        ...(target.debug || {}),
        ...(source.debug || {}),
      },
    };
  }

  /**
   * 타입 노드 트리 순회
   */
  traverse(
    node: TypeNode,
    visitor: (node: TypeNode, depth: number) => void,
    depth = 0
  ): void {
    visitor(node, depth);

    if (node.children) {
      node.children.forEach((child) =>
        this.traverse(child, visitor, depth + 1)
      );
    }

    if (node.typeArguments) {
      node.typeArguments.forEach((arg) =>
        this.traverse(arg, visitor, depth + 1)
      );
    }

    if (node.objectMembers) {
      node.objectMembers.forEach((member) =>
        this.traverse(member.node, visitor, depth + 1)
      );
    }

    if (node.elementType) {
      this.traverse(node.elementType, visitor, depth + 1);
    }
  }

  /**
   * 디버깅용 트리 출력
   */
  printTree(node: TypeNode, indent = 0): string {
    const indentStr = "  ".repeat(indent);
    const complexityStr = node.metadata?.complexity
      ? ` (complexity: ${node.metadata.complexity.score})`
      : "";
    let result = `${indentStr}${node.kind}: ${
      node.name || node.literal || ""
    }${complexityStr}\n`;

    if (node.children) {
      node.children.forEach((child) => {
        result += this.printTree(child, indent + 1);
      });
    }

    return result;
  }
}

// 싱글톤 인스턴스 export
export const typeNodeFactory = new TypeNodeFactory();
export const typeNodeUtils = new TypeNodeUtils();
