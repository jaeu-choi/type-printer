import * as ts from "typescript";
import {
  TypeHandler,
  TypeStructure,
  TypeCollectionContext,
  ObjectProperty,
} from "../types";
import { TypeStructureCollector } from "./index";

export class IntersectionTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isIntersectionTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const intersectionNode = node as ts.IntersectionTypeNode;

    // 최종 계산된 타입 가져오기 (TypeScript 컴파일러가 병합한 결과)
    const finalType = context.checker.getTypeFromTypeNode(intersectionNode);
    const finalTypeString = context.checker.typeToString(finalType);

    // 명목적 과정 (각 개별 타입의 구조)
    const nominalChildren = intersectionNode.types.map((child) =>
      new TypeStructureCollector().collect(child, context)
    );

    // 최종 병합 결과 계산 - 원본 AST 노드 정보 전달
    const computedResult = this.computeFinalIntersectionResult(
      finalType,
      context,
      finalTypeString,
      intersectionNode
    );

    const structure: TypeStructure = {
      type: "intersection",
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과 모두 표시
      structure.children = nominalChildren;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 병합 결과만 표시
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private computeFinalIntersectionResult(
    intersectionType: ts.Type,
    context: TypeCollectionContext,
    finalTypeString: string,
    intersectionNode: ts.IntersectionTypeNode
  ): TypeStructure {
    console.log("=== computeFinalIntersectionResult ===");
    console.log("finalTypeString:", finalTypeString);
    console.log("intersectionType.flags:", intersectionType.flags);

    // 1. Never 타입 체크 (최우선)
    if (intersectionType.flags & ts.TypeFlags.Never) {
      console.log("✓ Never 타입 감지");
      return {
        type: "primitive",
        value: "never",
        metadata: { finalTypeString: "never" },
      };
    }

    // 2. Primitive + Object intersection → Never 감지
    console.log("Never 타입 추가 검사 시작...");
    console.log(
      "finalTypeString이 primitive가 아님:",
      finalTypeString !== "string" &&
        finalTypeString !== "number" &&
        finalTypeString !== "boolean"
    );

    if (
      finalTypeString !== "string" &&
      finalTypeString !== "number" &&
      finalTypeString !== "boolean"
    ) {
      const hasStringMember = this.hasPrimitiveTypeMember(
        intersectionNode,
        context,
        ts.TypeFlags.String
      );
      const hasNumberMember = this.hasPrimitiveTypeMember(
        intersectionNode,
        context,
        ts.TypeFlags.Number
      );
      const hasBooleanMember = this.hasPrimitiveTypeMember(
        intersectionNode,
        context,
        ts.TypeFlags.Boolean
      );
      const hasObjectMember = this.hasObjectTypeMember(
        intersectionNode,
        context
      );

      console.log("hasStringMember:", hasStringMember);
      console.log("hasNumberMember:", hasNumberMember);
      console.log("hasBooleanMember:", hasBooleanMember);
      console.log("hasObjectMember:", hasObjectMember);

      if (
        (hasStringMember || hasNumberMember || hasBooleanMember) &&
        hasObjectMember
      ) {
        console.log("✓ Primitive + Object intersection 감지 → never");
        return {
          type: "primitive",
          value: "never",
          metadata: { finalTypeString: "never" },
        };
      }
    }

    // 3. 기본 primitive 타입들 체크
    if (intersectionType.flags & ts.TypeFlags.String) {
      console.log("✓ String 타입 감지");
      return {
        type: "primitive",
        value: "string",
        metadata: { finalTypeString },
      };
    }

    if (intersectionType.flags & ts.TypeFlags.Number) {
      console.log("✓ Number 타입 감지");
      return {
        type: "primitive",
        value: "number",
        metadata: { finalTypeString },
      };
    }

    if (intersectionType.flags & ts.TypeFlags.Boolean) {
      console.log("✓ Boolean 타입 감지");
      return {
        type: "primitive",
        value: "boolean",
        metadata: { finalTypeString },
      };
    }

    // 4. Union 타입 체크
    if (intersectionType.isUnion()) {
      console.log("✓ Union 타입 감지");
      const unionMembers = intersectionType.types.map((memberType) => {
        const memberString = context.checker.typeToString(memberType);
        return {
          type: "primitive" as const,
          value: memberString,
          metadata: { finalTypeString: memberString },
        };
      });

      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString },
      };
    }

    // 5. 객체 타입 체크
    const properties = intersectionType.getProperties();
    console.log("Properties count:", properties.length);

    if (properties.length > 0) {
      if (properties.length > 50) {
        console.log("✓ Too many properties → primitive fallback");
        return {
          type: "primitive",
          value: finalTypeString,
          metadata: { finalTypeString },
        };
      }

      console.log("✓ Object 타입으로 처리");
      const objProperties = this.collectMergedProperties(
        intersectionType,
        context
      );
      return {
        type: "object",
        properties: objProperties,
        metadata: { finalTypeString },
      };
    }

    // 6. 기본 fallback
    console.log("✓ Fallback to primitive");
    return {
      type: "primitive",
      value: finalTypeString,
      metadata: { finalTypeString },
    };
  }

  private hasPrimitiveTypeMember(
    intersectionNode: ts.IntersectionTypeNode,
    context: TypeCollectionContext,
    primitiveFlag: ts.TypeFlags
  ): boolean {
    console.log("hasPrimitiveTypeMember 체크, flag:", primitiveFlag);

    const result = intersectionNode.types.some((memberNode) => {
      const memberType = context.checker.getTypeFromTypeNode(memberNode);
      const hasFlag = !!(memberType.flags & primitiveFlag);
      console.log(
        `  멤버 "${memberNode.getText()}" flags:`,
        memberType.flags,
        "hasFlag:",
        hasFlag
      );
      return hasFlag;
    });

    console.log("hasPrimitiveTypeMember 결과:", result);
    return result;
  }

  private hasObjectTypeMember(
    intersectionNode: ts.IntersectionTypeNode,
    context: TypeCollectionContext
  ): boolean {
    console.log("hasObjectTypeMember 체크");

    const result = intersectionNode.types.some((memberNode) => {
      const memberType = context.checker.getTypeFromTypeNode(memberNode);

      // 객체 타입인지 확인 (primitive가 아니고 프로퍼티가 있음)
      const isPrimitive = !!(
        memberType.flags &
        (ts.TypeFlags.String |
          ts.TypeFlags.Number |
          ts.TypeFlags.Boolean |
          ts.TypeFlags.Null |
          ts.TypeFlags.Undefined |
          ts.TypeFlags.Void |
          ts.TypeFlags.Any |
          ts.TypeFlags.Never |
          ts.TypeFlags.Unknown)
      );

      const propCount = memberType.getProperties().length;
      const isObject = !isPrimitive && propCount > 0;

      console.log(
        `  멤버 "${memberNode.getText()}" flags:`,
        memberType.flags,
        "isPrimitive:",
        isPrimitive,
        "propCount:",
        propCount,
        "isObject:",
        isObject
      );

      return isObject;
    });

    console.log("hasObjectTypeMember 결과:", result);
    return result;
  }

  private collectMergedProperties(
    intersectionType: ts.Type,
    context: TypeCollectionContext
  ): ObjectProperty[] {
    const properties: ObjectProperty[] = [];
    const seenProperties = new Set<string>();

    try {
      const props = intersectionType.getProperties();

      for (const prop of props) {
        if (seenProperties.has(prop.name)) continue;
        seenProperties.add(prop.name);

        const propType = context.checker.getTypeOfSymbolAtLocation(
          prop,
          prop.valueDeclaration || prop.declarations?.[0]!
        );
        const propTypeString = context.checker.typeToString(propType);

        const optional = !!(prop.flags & ts.SymbolFlags.Optional);

        let readonly = false;
        if (
          prop.valueDeclaration &&
          ts.isPropertySignature(prop.valueDeclaration)
        ) {
          readonly = !!prop.valueDeclaration.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          );
        }

        const finalPropType = this.createFinalPropertyType(propType, context);

        properties.push({
          name: prop.name,
          type: finalPropType,
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Debug - Error collecting intersection properties:", error);
    }

    return properties;
  }

  private createFinalPropertyType(
    propType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const propTypeString = context.checker.typeToString(propType);
    console.log("=== createFinalPropertyType ===");
    console.log("propTypeString:", propTypeString);
    console.log("propType.flags:", propType.flags);
    console.log(
      "propType.getProperties()?.length:",
      propType.getProperties()?.length
    );

    // 1. Primitive 타입 먼저 체크 (가장 중요!)
    const isPrimitive = !!(
      propType.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.TemplateLiteral |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Void |
        ts.TypeFlags.Any |
        ts.TypeFlags.Never |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol)
    );
    console.log("isPrimitive:", isPrimitive);

    if (isPrimitive) {
      console.log("✓ Primitive 타입으로 처리:", propTypeString);
      return {
        type: "primitive",
        value: propTypeString,
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 2. Union 타입 체크
    if (propType.isUnion()) {
      console.log("✓ Union 타입으로 처리");
      const unionMembers = propType.types.map((memberType) => {
        // Union 멤버도 재귀적으로 처리
        return this.createFinalPropertyType(memberType, context);
      });

      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 3. 배열 타입 체크 (객체보다 먼저)
    const typeArgs = context.checker.getTypeArguments(
      propType as ts.TypeReference
    );
    if (typeArgs && typeArgs.length > 0 && propTypeString.endsWith("[]")) {
      console.log("✓ Array 타입으로 처리");
      const elementType = context.checker.typeToString(typeArgs[0]);
      return {
        type: "array",
        children: [
          {
            type: "primitive",
            value: elementType,
            metadata: { finalTypeString: elementType },
          },
        ],
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 4. 실제 객체 타입 체크 (사용자 정의 객체만)
    const properties = propType.getProperties();
    console.log("Properties count:", properties.length);

    if (properties.length > 0 && properties.length <= 50) {
      console.log("✓ Object 타입으로 처리 (적은 프로퍼티)");
      // 내장 타입이 아닌 실제 사용자 정의 객체만 처리
      const nestedProperties = this.collectMergedProperties(propType, context);
      return {
        type: "object",
        properties: nestedProperties,
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 5. 기본 fallback - 복잡한 타입은 문자열로
    console.log("✓ Fallback to primitive:", propTypeString);
    return {
      type: "primitive",
      value: propTypeString,
      metadata: { finalTypeString: propTypeString },
    };
  }
}
