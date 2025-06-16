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
        ...metadata,
      },
    };
  }

  createUnion(
    members: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
    // 🔍 디버깅: 입력된 메타데이터 확인
    console.log(`🔍 createUnion input metadata:`, metadata);
    console.log(
      `🔍 createUnion finalTypeString: "${metadata?.finalTypeString}"`
    );

    const unionTypeString = members
      .map(
        (m) => m.metadata?.finalTypeString || m.literal || m.name || "unknown"
      )
      .join(" | ");

    const finalMetadata = {
      originalText: unionTypeString,
      finalTypeString: unionTypeString, // 기본값
      ...metadata, // 🎯 전달받은 메타데이터로 덮어쓰기 (중요!)
    };

    // 🔍 디버깅: 최종 메타데이터 확인
    console.log(`🔍 createUnion final metadata:`, finalMetadata);
    console.log(
      `🔍 createUnion final finalTypeString: "${finalMetadata.finalTypeString}"`
    );

    const result = {
      kind: "union" as const,
      children: members,
      metadata: finalMetadata,
    };

    // 🔍 디버깅: 생성된 결과 확인
    console.log(
      `🔍 createUnion result metadata: "${result.metadata?.finalTypeString}"`
    );

    return result;
  }
  /**
   * 교집합 타입 노드 생성
   */
  createIntersection(
    members: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode {
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

    return {
      kind: "function",
      functionInfo,
      children: [returnType, ...parameters.map((p) => p.type)],
      metadata: {
        originalText: functionInfo.signature,
        finalTypeString: functionInfo.signature,
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

    return {
      kind: "template",
      templateLiteralInfo: templateInfo,
      children: parts,
      metadata: {
        originalText: `\`${parts
          .map((p) => "${" + (p.name || p.literal || "unknown") + "}")
          .join("")}\``,
        finalTypeString: resolvedString || "template-literal",
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

    return {
      kind: "indexAccess",
      indexAccessInfo,
      children: [objectType, indexType],
      metadata: {
        originalText: `${objectType.name || "T"}[${
          indexType.literal || indexType.name || "K"
        }]`,
        finalTypeString: resolvedType?.metadata?.finalTypeString || "unknown",
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
        ...metadata,
      },
    };
  }

  // === 🔧 헬퍼 메서드들 ===

  /**
   * 내장 타입 확인
   */
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

  /**
   * 함수 시그니처 생성
   */
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
      genericInfo: source.genericInfo || target.genericInfo,
      debug: {
        warnings: [], // 기본값
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
    let result = `${indentStr}${node.kind}: ${
      node.name || node.literal || ""
    }\n`;

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
