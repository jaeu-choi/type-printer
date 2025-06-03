import * as ts from "typescript";
import {
  TypeHandler,
  TypeStructure,
  TypeCollectionContext,
  ObjectProperty,
} from "../types";
import { TypeStructureCollector } from "./index";

export class IndexAccessHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isIndexedAccessTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const indexNode = node as ts.IndexedAccessTypeNode;

    // 최종 계산된 타입 가져오기 (TypeScript 컴파일러가 계산한 결과)
    const finalType = context.checker.getTypeFromTypeNode(indexNode);
    const finalTypeString = context.checker.typeToString(finalType);
    if (finalType.isUnion()) {
      console.log("Union types count:", finalType.types.length);
      finalType.types.forEach((t, i) => {
        console.log(
          `  Union[${i}]:`,
          context.checker.typeToString(t),
          "flags:",
          t.flags
        );
      });
    }

    // 명목적 과정: 원본 AST에서 참조 추적 정보 추출
    const nominalProcess = this.extractNominalProcess(indexNode, context);

    // 최종 결과 계산
    const computedResult = this.computeFinalIndexAccessResult(
      finalType,
      context,
      indexNode
    );

    // FIXED: finalTypeString이 타입 이름이 아닌 실제 해석된 타입 문자열이 되도록 수정
    let actualFinalTypeString = finalTypeString;
    if (computedResult.type === "union" && computedResult.children) {
      // Union 타입인 경우 실제 멤버들로 문자열 구성
      const memberStrings = computedResult.children.map((child) => {
        if (child.value) return child.value;
        if (child.metadata?.finalTypeString)
          return child.metadata.finalTypeString;
        return "unknown";
      });
      actualFinalTypeString = memberStrings.join(" | ");
      console.log("✓ Union finalTypeString 재구성:", actualFinalTypeString);
    }

    const structure: TypeStructure = {
      type: "access",
      metadata: {
        originalText: indexNode.getText(),
        finalTypeString: actualFinalTypeString, // FIXED: 실제 해석된 타입 사용
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과 모두 표시
      structure.children = nominalProcess;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만 표시
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private extractNominalProcess(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): TypeStructure[] {
    const process: TypeStructure[] = [];

    // 1. 객체 타입 참조 정보
    const objectTypeStructure = new TypeStructureCollector().collect(
      indexNode.objectType,
      context
    );
    process.push({
      type: "reference",
      name: "[ObjectType]",
      children: [objectTypeStructure],
      metadata: { originalText: indexNode.objectType.getText() },
    });

    // 2. 인덱스 타입 정보
    const indexTypeStructure = new TypeStructureCollector().collect(
      indexNode.indexType,
      context
    );
    process.push({
      type: "reference",
      name: "[IndexType]",
      children: [indexTypeStructure],
      metadata: { originalText: indexNode.indexType.getText() },
    });

    // 3. 원본 타입 정보 (AST에서 추출한 참조 추적)
    const originalTypeInfo = this.extractOriginalTypeInfo(indexNode, context);

    if (originalTypeInfo.length > 0) {
      const referenceTrace = originalTypeInfo.map((info, index) => ({
        type: "reference" as const,
        name: info.typeName
          ? `[Reference: ${info.typeName}]`
          : `[Member ${index}]`,
        metadata: {
          originalText: info.typeNode?.getText() || "",
          originalTypeName: info.typeName,
        },
      }));

      process.push({
        type: "reference",
        name: "[ReferenceTrace]",
        children: referenceTrace,
        metadata: { originalText: "Reference tracking from AST" },
      });
    }

    return process;
  }

  private computeFinalIndexAccessResult(
    finalType: ts.Type,
    context: TypeCollectionContext,
    indexNode: ts.IndexedAccessTypeNode
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(finalType);

    // ✨ CRITICAL FIX: 원시 타입 먼저 체크!
    if (this.isPrimitiveType(finalType)) {
      console.log("✓ Primitive 타입으로 처리:", finalTypeString);
      return {
        type: "primitive",
        value: finalTypeString,
        metadata: { finalTypeString },
      };
    }

    // ✨ CRITICAL FIX: 리터럴 타입 체크
    if (this.isLiteralType(finalType)) {
      console.log("✓ Literal 타입으로 처리:", finalTypeString);
      return {
        type: "literal",
        value: finalTypeString,
        metadata: { finalTypeString },
      };
    }

    // Union 타입인 경우 (예: User["age"] = number | Client)
    if (finalType.isUnion()) {
      const finalMembers = finalType.types.map((memberType, index) => {
        const memberString = context.checker.typeToString(memberType);

        const memberResult = this.createFinalMemberStructure(
          memberType,
          context
        );

        return memberResult;
      });
      // FIXED: Union 결과에 올바른 finalTypeString 설정
      const memberStrings = finalMembers.map((member) => {
        if (member.value) return member.value;
        if (member.metadata?.finalTypeString)
          return member.metadata.finalTypeString;
        return "unknown";
      });
      const unionTypeString = memberStrings.join(" | ");

      const unionResult = {
        type: "union" as const,
        children: finalMembers,
        metadata: {
          finalTypeString: unionTypeString, // FIXED: 실제 union 문자열 사용
          originalText: indexNode.getText(),
        },
      };

      return unionResult;
    }

    // 배열 타입인 경우
    if (this.isArrayType(finalType, finalTypeString)) {
      return this.createArrayStructure(finalType, finalTypeString, context);
    }

    // 실제 사용자 정의 객체 타입인 경우에만 프로퍼티 수집
    if (this.isUserDefinedObjectType(finalType, context)) {
      const properties = this.collectFinalProperties(finalType, context);
      return {
        type: "object",
        properties,
        metadata: { finalTypeString },
      };
    }

    // 참조 타입인 경우
    if (this.isReferenceType(finalType)) {
      return this.createReferenceStructure(finalType, finalTypeString, context);
    }

    // 기본 fallback
    console.log("✓ Fallback to primitive");
    return {
      type: "primitive",
      value: finalTypeString,
      metadata: { finalTypeString },
    };
  }

  private createFinalMemberStructure(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const memberTypeString = context.checker.typeToString(memberType);

    // 원시 타입 먼저 체크!
    if (this.isPrimitiveType(memberType)) {
      return {
        type: "primitive",
        value: memberTypeString,
        metadata: { finalTypeString: memberTypeString },
      };
    }

    // 리터럴 타입 체크
    if (this.isLiteralType(memberType)) {
      return {
        type: "literal",
        value: memberTypeString,
        metadata: { finalTypeString: memberTypeString },
      };
    }

    // Union 타입인 경우 (중첩 Union)
    if (memberType.isUnion()) {
      const nestedMembers = memberType.types.map((nestedType, i) => {
        console.log(
          `  Nested Union[${i}]:`,
          context.checker.typeToString(nestedType)
        );
        return this.createFinalMemberStructure(nestedType, context);
      });

      // FIXED: 중첩 Union도 올바른 finalTypeString 생성
      const nestedMemberStrings = nestedMembers.map((member) => {
        if (member.value) return member.value;
        if (member.metadata?.finalTypeString)
          return member.metadata.finalTypeString;
        return "unknown";
      });
      const nestedUnionString = nestedMemberStrings.join(" | ");

      return {
        type: "union",
        children: nestedMembers,
        metadata: { finalTypeString: nestedUnionString }, // FIXED
      };
    }

    // 객체 타입인 경우 (사용자 정의만)
    if (this.isUserDefinedObjectType(memberType, context)) {
      const properties = this.collectFinalProperties(memberType, context);
      return {
        type: "object",
        properties,
        metadata: { finalTypeString: memberTypeString },
      };
    }

    // 사용자 정의 타입 참조인 경우 (심볼이 있는 경우)
    if (this.isReferenceType(memberType)) {
      return this.createReferenceStructure(
        memberType,
        memberTypeString,
        context
      );
    }

    // 기본 처리
    console.log("→ 기본 primitive 처리");
    return {
      type: "primitive",
      value: memberTypeString,
      metadata: { finalTypeString: memberTypeString },
    };
  }

  // ✨ NEW: 타입 판별 메서드들
  private isPrimitiveType(type: ts.Type): boolean {
    const result = !!(
      type.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined)
    );
    return result;
  }

  private isLiteralType(type: ts.Type): boolean {
    const result = !!(
      type.flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.TemplateLiteral |
        ts.TypeFlags.EnumLiteral)
    );
    return result;
  }

  private isArrayType(type: ts.Type, typeString: string): boolean {
    const result =
      typeString.endsWith("[]") ||
      (type.symbol && type.symbol.name === "Array") ||
      typeString.startsWith("Array<");
    return result;
  }

  private isUserDefinedObjectType(
    type: ts.Type,
    context: TypeCollectionContext
  ): boolean {
    // 원시 타입이나 리터럴 타입이면 제외
    if (this.isPrimitiveType(type) || this.isLiteralType(type)) {
      return false;
    }

    // 배열 타입이면 제외
    const typeString = context.checker.typeToString(type);
    if (this.isArrayType(type, typeString)) {
      return false;
    }

    // 프로퍼티가 있는지 확인
    const properties = type.getProperties();
    if (!properties || properties.length === 0) {
      return false;
    }

    // ✨ CRITICAL: 빌트인 타입의 프로토타입 메서드들 제외
    if (this.hasOnlyBuiltinMethods(properties)) {
      return false;
    }

    // 프로퍼티가 너무 많으면 제외 (복잡한 빌트인 타입일 가능성)
    if (properties.length > 50) {
      return false;
    }

    return true;
  }

  private hasOnlyBuiltinMethods(properties: ts.Symbol[]): boolean {
    // 일반적인 빌트인 메서드 이름들
    const builtinMethods = new Set([
      "toString",
      "valueOf",
      "toLocaleString",
      "toFixed",
      "toExponential",
      "toPrecision", // number methods
      "charAt",
      "charCodeAt",
      "concat",
      "indexOf",
      "slice",
      "substring", // string methods
      "constructor",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable", // Object methods
    ]);

    const result = properties.every((prop) => builtinMethods.has(prop.name));
    return result;
  }

  private isReferenceType(type: ts.Type): boolean {
    const result = !!(
      type.symbol &&
      type.symbol.declarations &&
      type.symbol.declarations.length > 0 &&
      type.symbol.flags &
        (ts.SymbolFlags.Type | ts.SymbolFlags.Interface | ts.SymbolFlags.Class)
    );
    return result;
  }

  private createArrayStructure(
    type: ts.Type,
    typeString: string,
    context: TypeCollectionContext
  ): TypeStructure {
    const typeArgs = context.checker.getTypeArguments(type as ts.TypeReference);

    if (typeArgs && typeArgs.length > 0) {
      const elementType = typeArgs[0];
      const elementStructure = this.createFinalMemberStructure(
        elementType,
        context
      );

      return {
        type: "array",
        children: [elementStructure],
        metadata: { finalTypeString: typeString },
      };
    }

    return {
      type: "array",
      metadata: { finalTypeString: typeString },
    };
  }

  private createReferenceStructure(
    type: ts.Type,
    typeString: string,
    context: TypeCollectionContext
  ): TypeStructure {
    const declaration = type.symbol?.declarations?.[0];
    let typeName = "Unknown";

    if (declaration) {
      if (ts.isTypeAliasDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      } else if (ts.isInterfaceDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      } else if (ts.isClassDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      }
    }

    // 내장 타입 체크
    if (this.isBuiltinType(typeName)) {
      return {
        type: "reference",
        name: typeName,
        metadata: {
          isBuiltin: true,
          finalTypeString: typeString,
        },
      };
    }

    // 참조 타입이 실제로 사용자 정의 객체 구조를 가지는지 확인
    if (this.isUserDefinedObjectType(type, context)) {
      return {
        type: "object",
        properties: this.collectFinalProperties(type, context),
        metadata: { finalTypeString: typeString },
      };
    }

    // 단순 참조 타입
    const structure: TypeStructure = {
      type: "reference",
      name: `[${typeName}]`,
      metadata: {
        isBuiltin: false,
        finalTypeString: typeString,
        originalTypeName: typeName,
      },
    };

    // 컨텍스트에 따라 확장 여부 결정
    if (context.expanded && this.shouldExpandReference(context)) {
      const expanded = this.expandTypeDeclaration(
        declaration!,
        typeName,
        context
      );
      if (expanded) {
        structure.children = [expanded];
      }
    }

    return structure;
  }

  private collectFinalProperties(
    objectType: ts.Type,
    context: TypeCollectionContext
  ): ObjectProperty[] {
    const properties: ObjectProperty[] = [];

    try {
      const props = objectType.getProperties();

      for (const prop of props) {
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

        properties.push({
          name: prop.name,
          type: {
            type: "primitive",
            value: propTypeString,
            metadata: { finalTypeString: propTypeString },
          },
          optional,
          readonly,
        });
      }
    } catch (error) {}
    return properties;
  }

  // Union 인덱스 지원을 위한 수정된 extractOriginalTypeInfo
  private extractOriginalTypeInfo(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    console.log("=== extractOriginalTypeInfo 시작 ===");
    try {
      if (!ts.isTypeReferenceNode(indexNode.objectType)) {
        console.log("objectType이 TypeReferenceNode가 아님");
        return [];
      }

      const objectTypeName = indexNode.objectType.typeName.getText();

      const typeDeclaration = this.findTypeDeclarationInProgram(
        objectTypeName,
        context
      );
      if (!typeDeclaration) {
        return [];
      }

      // ✨ NEW: Union 인덱스 타입 처리
      if (ts.isUnionTypeNode(indexNode.indexType)) {
        const allResults: Array<{ typeName?: string; typeNode?: ts.TypeNode }> =
          [];

        // 각 Union 멤버별로 타입 추출
        for (const unionMember of indexNode.indexType.types) {
          if (ts.isLiteralTypeNode(unionMember)) {
            const propertyName = unionMember.literal
              .getText()
              .replace(/['"]/g, "");
            console.log(`  - Union 멤버 "${propertyName}" 처리 중...`);

            let memberResults: Array<{
              typeName?: string;
              typeNode?: ts.TypeNode;
            }> = [];

            if (ts.isInterfaceDeclaration(typeDeclaration)) {
              memberResults = this.extractFromInterface(
                typeDeclaration,
                propertyName
              );
            } else if (
              ts.isTypeAliasDeclaration(typeDeclaration) &&
              ts.isTypeLiteralNode(typeDeclaration.type)
            ) {
              memberResults = this.extractFromTypeLiteral(
                typeDeclaration.type,
                propertyName
              );
            }

            allResults.push(...memberResults);
          }
        }

        return allResults;
      }

      // 기존 단일 리터럴 처리
      if (!ts.isLiteralTypeNode(indexNode.indexType)) {
        return [];
      }

      const propertyName = indexNode.indexType.literal
        .getText()
        .replace(/['"]/g, "");

      if (ts.isInterfaceDeclaration(typeDeclaration)) {
        return this.extractFromInterface(typeDeclaration, propertyName);
      } else if (
        ts.isTypeAliasDeclaration(typeDeclaration) &&
        ts.isTypeLiteralNode(typeDeclaration.type)
      ) {
        return this.extractFromTypeLiteral(typeDeclaration.type, propertyName);
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  private extractFromInterface(
    interfaceDecl: ts.InterfaceDeclaration,
    propertyName: string
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    console.log(`extractFromInterface: ${propertyName}`);
    for (const member of interfaceDecl.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const memberName = member.name.getText().replace(/['"]/g, "");
        if (memberName === propertyName && member.type) {
          console.log(`찾음: ${memberName} → ${member.type.getText()}`);
          return this.extractTypeInfoFromTypeNode(member.type);
        }
      }
    }
    return [];
  }

  private extractFromTypeLiteral(
    typeLiteral: ts.TypeLiteralNode,
    propertyName: string
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    console.log(`extractFromTypeLiteral: ${propertyName}`);
    for (const member of typeLiteral.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const memberName = member.name.getText().replace(/['"]/g, "");
        if (memberName === propertyName && member.type) {
          console.log(`찾음: ${memberName} → ${member.type.getText()}`);
          return this.extractTypeInfoFromTypeNode(member.type);
        }
      }
    }
    return [];
  }

  private extractTypeInfoFromTypeNode(
    typeNode: ts.TypeNode
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    console.log(`extractTypeInfoFromTypeNode: ${typeNode.getText()}`);
    if (ts.isUnionTypeNode(typeNode)) {
      console.log("Union 타입 노드 처리");
      return typeNode.types.map((unionMember, i) => {
        console.log(`  Union[${i}]: ${unionMember.getText()}`);
        if (ts.isTypeReferenceNode(unionMember)) {
          return {
            typeName: unionMember.typeName.getText(),
            typeNode: unionMember,
          };
        }
        return { typeNode: unionMember };
      });
    } else if (ts.isTypeReferenceNode(typeNode)) {
      return [
        {
          typeName: typeNode.typeName.getText(),
          typeNode: typeNode,
        },
      ];
    } else {
      console.log("기타 타입 노드 처리");
      return [{ typeNode: typeNode }];
    }
  }

  private findTypeDeclarationInProgram(
    typeName: string,
    context: TypeCollectionContext
  ): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | null {
    const sourceFiles = context.program.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      for (const statement of sourceFile.statements) {
        if (
          (ts.isTypeAliasDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement)) &&
          statement.name?.text === typeName
        ) {
          return statement;
        }
      }
    }
    return null;
  }

  private isBuiltinType(name: string): boolean {
    const builtinTypes = [
      "Array",
      "Promise",
      "Record",
      "Pick",
      "Omit",
      "Partial",
      "Required",
      "Readonly",
      "NonNullable",
      "ReturnType",
      "Parameters",
      "ConstructorParameters",
      "InstanceType",
      "ThisParameterType",
      "OmitThisParameter",
      "ThisType",
      "Uppercase",
      "Lowercase",
      "Capitalize",
      "Uncapitalize",
      "Extract",
      "Exclude",
    ];
    return builtinTypes.includes(name);
  }

  private shouldExpandReference(context: TypeCollectionContext): boolean {
    return context.depth < context.maxDepth;
  }

  private expandTypeDeclaration(
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
    const properties: ObjectProperty[] = [];

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
}
