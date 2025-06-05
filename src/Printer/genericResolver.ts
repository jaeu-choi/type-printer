import * as ts from "typescript";
import { TypeStructure, TypeCollectionContext } from "./types";

// =====================================================
// 1. GenericResolver - 제네릭 관련 로직 전담
// =====================================================

export class GenericResolver {
  constructor(
    private readonly checker: ts.TypeChecker,
    private readonly sourceFile: ts.SourceFile
  ) {}

  /**
   * 제네릭 타입 요청 파싱
   * "Flatten<Nested>" → { typeName: "Flatten", typeArgs: ["Nested"] }
   */
  parseTypeRequest(input: string): {
    typeName: string;
    isInstantiated: boolean;
    typeArgs: string[];
  } {
    const genericMatch = input.match(/^([^<]+)<(.+)>$/);
    if (genericMatch) {
      const typeName = genericMatch[1].trim();
      const typeArgsString = genericMatch[2];
      const typeArgs = this.parseTypeArguments(typeArgsString);
      return { typeName, isInstantiated: true, typeArgs };
    }
    return { typeName: input, isInstantiated: false, typeArgs: [] };
  }

  /**
   * 타입 인자 문자열 파싱
   * "Nested, boolean" → ["Nested", "boolean"]
   */
  private parseTypeArguments(argsString: string): string[] {
    return argsString.split(",").map((arg) => arg.trim());
  }

  /**
   * 제네릭 컨텍스트 생성
   * <T, U> + [Nested, boolean] → Map { T: Nested, U: boolean }
   */
  createGenericContext(
    typeName: string,
    typeArgs: string[]
  ): Map<string, TypeStructure> {
    const context = new Map<string, TypeStructure>();

    const declaration = this.findTypeDeclaration(typeName);
    if (
      declaration &&
      "typeParameters" in declaration &&
      declaration.typeParameters
    ) {
      declaration.typeParameters.forEach((param, index) => {
        if (index < typeArgs.length) {
          const paramName = param.name.text;
          const argType = typeArgs[index];
          context.set(paramName, {
            type: "primitive",
            value: argType,
          });
        }
      });
    }

    return context;
  }

  private findTypeDeclaration(
    name: string
  ): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | null {
    for (const statement of this.sourceFile.statements) {
      if (
        (ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement)) &&
        statement.name?.text === name
      ) {
        return statement;
      }
    }
    return null;
  }
}
