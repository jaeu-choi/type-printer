import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { TypeStructureCollector } from "./index";

export class UnionTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isUnionTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const unionNode = node as ts.UnionTypeNode;

    // console.log("UnionTypeHandler: 처리 시작, expanded =", context.expanded);

    // 실제 Union 타입을 직접 가져오기
    const actualUnionType = context.checker.getTypeFromTypeNode(unionNode);
    const finalTypeString = context.checker.typeToString(actualUnionType);

    console.log("UnionTypeHandler: finalTypeString =", finalTypeString);

    // 명목적 과정 (각 멤버를 적절한 핸들러로 위임)
    const nominalChildren = unionNode.types.map((child) =>
      new TypeStructureCollector().collect(child, context)
    );

    // 최종 결과 계산 (각 타입요소를 분석해서 적절한 핸들러 호출)
    const computedResult = this.computeFinalUnionResult(
      actualUnionType,
      context
    );

    const structure: TypeStructure = {
      type: "union",
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과
      structure.children = nominalChildren;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private computeFinalUnionResult(
    unionType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    if (unionType.isUnion()) {
      console.log("Union 타입 멤버 수:", unionType.types.length);

      // 각 타입요소를 분석해서 적절히 처리
      const finalMembers = unionType.types.map((memberType, index) => {
        return this.analyzeAndProcessMember(memberType, index, context);
      });

      return {
        type: "union",
        children: finalMembers,
        metadata: {
          finalTypeString: context.checker.typeToString(unionType),
        },
      };
    } else {
      // Union이 아닌 경우
      const typeString = context.checker.typeToString(unionType);
      return {
        type: "primitive",
        value: typeString,
        metadata: { finalTypeString: typeString },
      };
    }
  }

  private analyzeAndProcessMember(
    memberType: ts.Type,
    index: number,
    context: TypeCollectionContext
  ): TypeStructure {
    const memberString = context.checker.typeToString(memberType);
    console.log(`타입요소 ${index}: ${memberString}`);

    // 1. 원시 타입 체크 (단순 처리)
    if (this.isPrimitiveType(memberType, memberString)) {
      return {
        type: "primitive",
        value: memberString,
        metadata: { finalTypeString: memberString },
      };
    }

    // 2. Union 타입 체크 (중첩 Union)
    if (memberType.isUnion()) {
      console.log(`타입요소 ${index}는 중첩 Union입니다`);
      return this.delegateToUnionHandler(memberType, context);
    }

    // 3. Intersection 타입 체크
    if (memberType.isIntersection()) {
      console.log(`타입요소 ${index}는 Intersection입니다`);
      return this.delegateToIntersectionHandler(memberType, context);
    }

    // 4. 객체 타입 체크
    if (this.isObjectType(memberType)) {
      console.log(`타입요소 ${index}는 객체 타입입니다`);
      return this.delegateToObjectHandler(memberType, context);
    }

    // 5. 배열 타입 체크
    if (this.isArrayType(memberType, memberString)) {
      console.log(`타입요소 ${index}는 배열 타입입니다`);
      return this.delegateToArrayHandler(memberType, context);
    }

    // 6. 참조 타입 체크 (사용자 정의 타입)
    if (this.isReferenceType(memberType)) {
      console.log(`타입요소 ${index}는 참조 타입입니다`);
      return this.delegateToReferenceHandler(memberType, context);
    }

    // 7. 리터럴 타입 체크
    if (this.isLiteralType(memberType)) {
      console.log(`타입요소 ${index}는 리터럴 타입입니다`);
      return this.delegateToLiteralHandler(memberType, context);
    }

    // 8. 기타 복잡한 타입들은 TypeStructureCollector로 위임
    console.log(
      `타입요소 ${index}는 복잡한 타입입니다 - TypeStructureCollector로 위임`
    );
    return this.delegateToCollector(memberType, context);
  }

  // === 타입 판별 메서드들 ===
  private isPrimitiveType(memberType: ts.Type, memberString: string): boolean {
    const primitiveFlags = [
      ts.TypeFlags.String,
      ts.TypeFlags.Number,
      ts.TypeFlags.Boolean,
      ts.TypeFlags.StringLiteral, // "hello" 추가
      ts.TypeFlags.NumberLiteral, // 42 추가
      ts.TypeFlags.BooleanLiteral, // true, false 추가
      ts.TypeFlags.BigIntLiteral, // 123n 추가
      ts.TypeFlags.TemplateLiteral, // `hello ${world}` 추가
      ts.TypeFlags.ESSymbol,
      ts.TypeFlags.BigInt,
      ts.TypeFlags.Unknown,
      ts.TypeFlags.Any,
      ts.TypeFlags.Never,
      ts.TypeFlags.Void,
      ts.TypeFlags.Null,
      ts.TypeFlags.Undefined,
    ];

    return primitiveFlags.some((flag) => memberType.flags & flag);
  }

  private isObjectType(memberType: ts.Type): boolean {
    return !!(
      memberType.getProperties &&
      memberType.getProperties().length > 0 &&
      !(memberType.flags & ts.TypeFlags.StringLiteral) &&
      !(memberType.flags & ts.TypeFlags.NumberLiteral) &&
      !(memberType.flags & ts.TypeFlags.BooleanLiteral)
    );
  }

  private isArrayType(memberType: ts.Type, memberString: string): boolean {
    // 배열 타입 패턴 체크
    return (
      memberString.endsWith("[]") ||
      (memberType.symbol && memberType.symbol.name === "Array") ||
      memberString.startsWith("Array<")
    );
  }

  private isReferenceType(memberType: ts.Type): boolean {
    return !!(
      memberType.symbol &&
      memberType.symbol.declarations &&
      memberType.symbol.declarations.length > 0 &&
      memberType.symbol.flags &
        (ts.SymbolFlags.Type | ts.SymbolFlags.Interface | ts.SymbolFlags.Class)
    );
  }

  private isLiteralType(memberType: ts.Type): boolean {
    return !!(
      memberType.flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.EnumLiteral)
    );
  }

  // === 핸들러 위임 메서드들 ===

  private delegateToUnionHandler(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    // 중첩 Union 타입을 재귀적으로 처리
    if (memberType.isUnion()) {
      const nestedMembers = memberType.types.map(
        (nestedType: ts.Type, i: number) =>
          this.analyzeAndProcessMember(nestedType, i, context)
      );

      return {
        type: "union",
        children: nestedMembers,
        metadata: {
          finalTypeString: context.checker.typeToString(memberType),
        },
      };
    }

    // Union이 아닌 경우 fallback
    return {
      type: "primitive",
      value: context.checker.typeToString(memberType),
      metadata: { finalTypeString: context.checker.typeToString(memberType) },
    };
  }

  private delegateToIntersectionHandler(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    // Intersection 타입 처리 로직
    const properties = this.collectIntersectionProperties(memberType, context);

    if (properties.length > 0) {
      return {
        type: "object",
        properties,
        metadata: {
          finalTypeString: context.checker.typeToString(memberType),
        },
      };
    } else {
      return {
        type: "primitive",
        value: context.checker.typeToString(memberType),
        metadata: { finalTypeString: context.checker.typeToString(memberType) },
      };
    }
  }

  private delegateToObjectHandler(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const properties = [];
    const props = memberType.getProperties();

    for (const prop of props) {
      const propType = context.checker.getTypeOfSymbolAtLocation(
        prop,
        prop.valueDeclaration || prop.declarations?.[0]!
      );

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

      // 프로퍼티 타입도 재귀적으로 분석
      const finalPropType = this.createPropertyType(propType, context);

      properties.push({
        name: prop.name,
        type: finalPropType,
        optional,
        readonly,
      });
    }

    return {
      type: "object",
      properties,
      metadata: {
        finalTypeString: context.checker.typeToString(memberType),
      },
    };
  }

  private delegateToArrayHandler(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    // 배열의 원소 타입 추출
    const typeArgs = context.checker.getTypeArguments(
      memberType as ts.TypeReference
    );

    if (typeArgs && typeArgs.length > 0) {
      const elementType = typeArgs[0];
      const elementStructure = this.analyzeAndProcessMember(
        elementType,
        0,
        context
      );

      return {
        type: "array",
        children: [elementStructure],
        metadata: { finalTypeString: context.checker.typeToString(memberType) },
      };
    }

    return {
      type: "array",
      metadata: { finalTypeString: context.checker.typeToString(memberType) },
    };
  }

  private delegateToReferenceHandler(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const declaration = memberType.symbol.declarations![0];
    let typeName = "Unknown";

    if (ts.isTypeAliasDeclaration(declaration) && declaration.name) {
      typeName = declaration.name.text;
    } else if (ts.isInterfaceDeclaration(declaration) && declaration.name) {
      typeName = declaration.name.text;
    } else if (ts.isClassDeclaration(declaration) && declaration.name) {
      typeName = declaration.name.text;
    }

    // 참조 타입이 실제로 객체 구조를 가지는지 확인
    if (memberType.getProperties && memberType.getProperties().length > 0) {
      // 객체 구조로 확장 - 이때 type을 "object"로 설정
      return this.delegateToObjectHandler(memberType, context);
    }

    // 단순 참조 타입
    const structure: TypeStructure = {
      type: "reference",
      name: `[${typeName}]`,
      metadata: {
        finalTypeString: context.checker.typeToString(memberType),
        originalTypeName: typeName,
      },
    };

    // 참조 확장 여부는 컨텍스트에 따라 결정
    if (context.expanded && context.depth < context.maxDepth) {
      const expanded = this.expandReference(declaration, typeName, context);
      if (expanded) {
        structure.children = [expanded];
      }
    }

    return structure;
  }

  private delegateToLiteralHandler(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    let literalValue: string;

    if (memberType.isStringLiteral()) {
      literalValue = `"${(memberType as ts.StringLiteralType).value}"`;
    } else if (memberType.isNumberLiteral()) {
      literalValue = (memberType as ts.NumberLiteralType).value.toString();
    } else if (memberType.flags & ts.TypeFlags.BooleanLiteral) {
      literalValue = context.checker.typeToString(memberType);
    } else {
      literalValue = context.checker.typeToString(memberType);
    }

    return {
      type: "literal",
      value: literalValue,
      metadata: { finalTypeString: literalValue },
    };
  }

  private delegateToCollector(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    // 복잡한 타입(IndexAccess, Conditional 등)은 TypeStructureCollector로 위임
    // 하지만 Type 객체에서 TypeNode를 직접 얻을 수 없으므로 fallback 처리
    const typeString = context.checker.typeToString(memberType);

    // 일단 primitive로 처리하되, 더 정확한 분석을 위해서는
    // AST 레벨에서 처리되어야 함 (명목적 과정에서)
    return {
      type: "primitive",
      value: typeString,
      metadata: {
        finalTypeString: typeString,
        needsASTAnalysis: true, // 마커 추가
      },
    };
  }

  // === 헬퍼 메서드들 ===

  private createPropertyType(
    propType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    // 프로퍼티 타입을 재귀적으로 분석
    // 1. Primitive 먼저 체크!
    if (
      this.isPrimitiveType(propType, context.checker.typeToString(propType))
    ) {
      return {
        type: "primitive",
        value: context.checker.typeToString(propType),
        metadata: { finalTypeString: context.checker.typeToString(propType) },
      };
    }

    // 2. Union 타입인 경우
    if (propType.isUnion()) {
      const unionMembers = propType.types.map(
        (memberType: ts.Type, i: number) =>
          this.analyzeAndProcessMember(memberType, i, context)
      );
      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString: context.checker.typeToString(propType) },
      };
    }

    // 3. 객체 타입인 경우
    if (this.isObjectType(propType)) {
      return this.delegateToObjectHandler(propType, context);
    }

    // 4. 배열 타입인 경우
    if (this.isArrayType(propType, context.checker.typeToString(propType))) {
      return this.delegateToArrayHandler(propType, context);
    }

    // 5. 참조 타입인 경우
    if (this.isReferenceType(propType)) {
      return this.delegateToReferenceHandler(propType, context);
    }

    // 6. 기본 처리
    return this.analyzeAndProcessMember(propType, 0, context);
  }

  private collectIntersectionProperties(
    intersectionType: ts.Type,
    context: TypeCollectionContext
  ) {
    const properties = [];
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

        const finalPropType = this.createPropertyType(propType, context);

        properties.push({
          name: prop.name,
          type: finalPropType,
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Intersection 프로퍼티 수집 오류:", error);
    }

    return properties;
  }

  private expandReference(
    declaration: ts.Declaration,
    typeName: string,
    context: TypeCollectionContext
  ): TypeStructure | null {
    const newContext = {
      ...context,
      depth: context.depth + 1,
      referencePath: [...context.referencePath, typeName],
    };

    if (ts.isTypeAliasDeclaration(declaration)) {
      return new TypeStructureCollector().collect(declaration.type, newContext);
    }

    if (ts.isInterfaceDeclaration(declaration)) {
      return this.collectInterfaceStructure(declaration, newContext);
    }

    return null;
  }

  private collectInterfaceStructure(
    node: ts.InterfaceDeclaration,
    context: TypeCollectionContext
  ): TypeStructure {
    const properties = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = member.name.getText();
        const optional = !!member.questionToken;
        const readonly =
          member.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          ) || false;

        const propType = member.type
          ? new TypeStructureCollector().collect(member.type, context)
          : { type: "primitive" as const, value: "any" };

        properties.push({
          name: propName,
          type: propType,
          optional,
          readonly,
        });
      }
    }

    return {
      type: "object",
      properties,
      metadata: { originalText: node.getText() },
    };
  }

  private extractTypeString(member: TypeStructure): string {
    if (member.value) return member.value;
    if (member.metadata?.finalTypeString)
      return member.metadata.finalTypeString;
    if (member.name) return member.name;
    return "unknown";
  }
}
