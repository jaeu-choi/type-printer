import { TypeInfo, TypeStructure, PrintOptions } from "./types";

export class TypeFormatter {
  private readonly DEFAULT_WIDTH = 50;
  private readonly INDENT_SIZE = 2;

  format(info: TypeInfo, options?: PrintOptions): string {
    const expanded = options?.expanded || false;
    const separator = "=".repeat(this.calculateOptimalWidth(info));
    const header = this.formatHeader(info.name, info.originalSource);

    let body: string;

    if (expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과 모두 표시
      body = this.formatExpandedView(info.structure, info.name);
    } else {
      // 기본 모드: 최종 결과만 간단히 표시
      body = this.formatResultView(info.structure, info.name);
    }

    return [
      separator,
      header,
      separator,
      `${info.name}:`,
      body,
      separator,
    ].join("\n");
  }

  private formatResultView(structure: TypeStructure, typeName: string): string {
    // 최종 계산 결과만 표시
    if (structure.computedResult) {
      console.log("✓ computedResult 사용");
      return this.formatStructure(structure.computedResult, false, 0);
    }

    // computedResult가 없으면 finalTypeString 사용
    if (structure.metadata?.finalTypeString) {
      console.log(
        "✓ finalTypeString 사용:",
        structure.metadata.finalTypeString
      );
      return this.formatFinalTypeString(structure.metadata.finalTypeString);
    }

    // 둘 다 없으면 기본 구조 표시
    console.log("✓ 기본 구조 사용");
    return this.formatStructure(structure, false, 0);
  }

  private formatExpandedView(
    structure: TypeStructure,
    typeName: string
  ): string {
    const parts: string[] = [];

    // 명목적 과정 표시
    if (structure.children && structure.children.length > 0) {
      parts.push("[Process]");
      structure.children.forEach((child) => {
        parts.push(this.formatStructure(child, true, 1));
      });
    }

    // 최종 결과 표시
    parts.push("[Result]");
    if (structure.computedResult) {
      parts.push(this.formatStructure(structure.computedResult, true, 1));
    } else if (structure.metadata?.finalTypeString) {
      parts.push(
        this.getIndent(1) +
          this.formatFinalTypeString(structure.metadata.finalTypeString)
      );
    } else {
      parts.push(this.formatStructure(structure, true, 1));
    }

    return parts.join("\n");
  }

  private formatFinalTypeString(finalTypeString: string): string {
    // 복잡한 타입 문자열을 적절히 파싱해서 표시
    try {
      // 간단한 객체 타입 파싱
      if (finalTypeString.startsWith("{") && finalTypeString.endsWith("}")) {
        return this.formatObjectTypeString(finalTypeString);
      }

      // Union 타입 파싱
      if (finalTypeString.includes(" | ")) {
        return this.formatUnionTypeString(finalTypeString);
      }

      // Intersection 타입 파싱
      if (finalTypeString.includes(" & ")) {
        return this.formatIntersectionTypeString(finalTypeString);
      }

      // 기본: 그대로 표시
      return finalTypeString;
    } catch (error) {
      return finalTypeString;
    }
  }

  private formatObjectTypeString(typeString: string): string {
    // "{ name: string; age: number }" 형태를 파싱
    const content = typeString.slice(1, -1).trim(); // 중괄호 제거
    if (!content) return "{}";

    const properties = content
      .split(";")
      .map((prop) => prop.trim())
      .filter(Boolean);
    const formattedProps = properties.map(
      (prop) => `${this.getIndent(1)}${prop};`
    );

    return `{\n${formattedProps.join("\n")}\n}`;
  }

  private formatUnionTypeString(typeString: string): string {
    const types = typeString.split(" | ").map((t) => t.trim());
    const formattedTypes = types.map((type) => `${this.getIndent(1)}${type}`);

    return `[Union]\n${formattedTypes.join("\n")}`;
  }

  private formatIntersectionTypeString(typeString: string): string {
    const types = typeString.split(" & ").map((t) => t.trim());
    const formattedTypes = types.map((type) => `${this.getIndent(1)}${type}`);

    return `[Intersection]\n${formattedTypes.join("\n")}`;
  }

  private calculateOptimalWidth(info: TypeInfo): number {
    const sourceWidth = info.originalSource.length;
    const maxDepth = this.getMaxDepth(info.structure);
    const estimatedWidth = Math.max(
      sourceWidth + 10,
      maxDepth * this.INDENT_SIZE + 30,
      this.DEFAULT_WIDTH
    );
    return Math.min(estimatedWidth, 100);
  }

  private getMaxDepth(structure: TypeStructure, currentDepth = 0): number {
    if (!structure.children || structure.children.length === 0) {
      return currentDepth;
    }
    return Math.max(
      ...structure.children.map((child) =>
        this.getMaxDepth(child, currentDepth + 1)
      )
    );
  }

  private formatHeader(name: string, originalSource: string): string {
    return `|            [Original]               |\n|${originalSource}`;
  }

  private formatStructure(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    propertyNameOffset: number = 0 // 새로 추가된 파라미터
  ): string {
    const indent = this.getIndent(depth);

    switch (structure.type) {
      case "primitive":
        return `${indent}${structure.value}`;

      case "literal":
        return `${indent}${structure.value}`;

      case "operator":
        const operatorHeader = `${indent}[${structure.metadata?.operator}]`;
        if (expanded && structure.children && structure.children.length > 0) {
          const childFormatted = this.formatStructure(
            structure.children[0],
            expanded,
            depth + 1,
            propertyNameOffset
          );
          return `${operatorHeader}\n${childFormatted}`;
        }
        return operatorHeader;

      case "access":
        const accessHeader = `${indent}[IndexedAccess]`;
        if (expanded && structure.children && structure.children.length >= 2) {
          const objFormatted = this.formatStructure(
            structure.children[0],
            expanded,
            depth + 1,
            propertyNameOffset
          );
          const indexFormatted = this.formatStructure(
            structure.children[1],
            expanded,
            depth + 1,
            propertyNameOffset
          );
          return `${accessHeader}\n${objFormatted}\n${indexFormatted}`;
        }
        return accessHeader;

      case "conditional":
        const condHeader = `${indent}[Conditional]`;
        if (expanded && structure.children && structure.children.length >= 4) {
          const parts = structure.children.map((child, i) => {
            const labels = ["Check", "Extends", "True", "False"];
            return `${indent}  [${labels[i]}]\n${this.formatStructure(
              child,
              expanded,
              depth + 2,
              propertyNameOffset
            )}`;
          });
          return `${condHeader}\n${parts.join("\n")}`;
        }
        return condHeader;

      case "reference":
        const typeArgs = structure.metadata?.typeArgs?.length
          ? `<${structure.metadata.typeArgs.join(", ")}>`
          : "";
        const refHeader = `${indent}${structure.name}${typeArgs}`;

        if (expanded && structure.children && structure.children.length > 0) {
          const childrenFormatted = structure.children
            .map((child) =>
              this.formatStructure(
                child,
                expanded,
                depth + 1,
                propertyNameOffset
              )
            )
            .join("\n");
          return `${refHeader}\n${childrenFormatted}`;
        }
        return refHeader;

      case "union":
        return this.formatUnionOrIntersection(
          structure,
          expanded,
          depth,
          "[Union]",
          propertyNameOffset
        );

      case "intersection":
        return this.formatUnionOrIntersection(
          structure,
          expanded,
          depth,
          "[Intersection]",
          propertyNameOffset
        );

      case "array":
        const arrayHeader = `${indent}Array`;
        if (expanded && structure.children && structure.children.length > 0) {
          const elementFormatted = this.formatStructure(
            structure.children[0],
            expanded,
            depth + 1,
            propertyNameOffset
          );
          return `${arrayHeader}\n${elementFormatted}`;
        }
        return arrayHeader;

      case "object":
        return this.formatObject(
          structure,
          expanded,
          depth,
          propertyNameOffset
        );

      default:
        return `${indent}${structure.metadata?.originalText || "Unknown"}`;
    }
  }

  private formatUnionOrIntersection(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    label: string,
    propertyNameOffset: number = 0
  ): string {
    if (!structure.children || structure.children.length === 0) {
      return label;
    }

    if (expanded) {
      // Union/Intersection 멤버들을 적절한 들여쓰기로 포맷팅
      const memberIndent = this.getIndent(depth + 1);
      const childrenFormatted = structure.children
        .map((child) => {
          if (child.type === "object") {
            // 객체 멤버는 memberIndent 위치에서 시작하되,
            // 객체 내부는 해당 위치 기준으로 들여쓰기
            const objectStr = this.formatObject(child, expanded, depth + 1, 0);
            return `${memberIndent}${objectStr}`;
          } else {
            // 기본 멤버들
            const childStr = this.formatStructure(child, expanded, 0, 0).trim();
            return `${memberIndent}${childStr}`;
          }
        })
        .join("\n");

      return `${label}\n${childrenFormatted}`;
    } else {
      // 기본 모드에서는 computedResult나 finalTypeString 사용
      if (structure.computedResult) {
        return this.formatStructure(
          structure.computedResult,
          false,
          depth,
          propertyNameOffset
        );
      } else if (structure.metadata?.finalTypeString) {
        const indent = this.getIndentWithOffset(depth, propertyNameOffset);
        return `${indent}${structure.metadata.finalTypeString}`;
      } else {
        const memberIndent = this.getIndent(depth + 1);
        const childrenFormatted = structure.children
          .map((child) => {
            if (child.type === "object") {
              const objectStr = this.formatObject(child, false, depth + 1, 0);
              return `${memberIndent}${objectStr}`;
            } else {
              const childStr = this.formatStructure(child, false, 0, 0).trim();
              return `${memberIndent}${childStr}`;
            }
          })
          .join("\n");
        return `${label}\n${childrenFormatted}`;
      }
    }
  }

  private formatObject(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    propertyNameOffset: number = 0
  ): string {
    // const braceIndent = this.getIndentWithOffset(depth, propertyNameOffset);
    // const propIndent = this.getIndent(depth + 1);
    const isTopLevelObject = propertyNameOffset === 0 && depth > 0;

    const braceIndent = isTopLevelObject
      ? this.getIndent(0) // 최상위 객체는 depth 0
      : this.getIndentWithOffset(depth, propertyNameOffset); // 나머지는 기존대로

    const propIndent = this.getIndent(depth + 1);
    if (!structure.properties || structure.properties.length === 0) {
      return `{}`;
    }

    const header = `{`;
    const footer = `}`;

    const properties = structure.properties.map((prop) => {
      const optional = prop.optional ? "?" : "";
      const readonly = prop.readonly ? "readonly " : "";
      const propDeclaration = `${readonly}${prop.name}${optional}: `;
      const propDeclIndent = `${propIndent}${propDeclaration}`;

      console.log(
        `=== formatObject 프로퍼티 처리: ${prop.name}, 타입: ${prop.type.type} ===`
      );

      // 프로퍼티 타입이 객체인지 확인
      if (prop.type.type === "object") {
        console.log(`✓ ${prop.name}을 중첩 객체로 처리`);
        // 중첩 객체를 프로퍼티 선언 위치에 맞춰 들여쓰기
        const nestedObject = this.formatObject(
          prop.type,
          expanded,
          depth + 1,
          propDeclaration.length
        );

        return `${propDeclIndent}${nestedObject};`;
      } else if (prop.type.type === "union") {
        console.log(`✓ ${prop.name}을 Union 타입으로 처리`);
        // Union 타입인 경우: 프로퍼티 이름과 [Union]을 한 줄에
        const nestedUnion = this.formatUnionOrIntersection(
          prop.type,
          expanded,
          depth + 1, // depth는 그대로, 헤더는 프로퍼티와 같은 레벨
          "[Union]",
          0 // 헤더는 오프셋 없이
        );

        return `${propIndent}${readonly}${prop.name}${optional}: ${nestedUnion};`;
      } else if (prop.type.type === "intersection") {
        console.log(`✓ ${prop.name}을 Intersection 타입으로 처리`);
        // Intersection 타입인 경우: 프로퍼티 선언 위치에 맞춰 들여쓰기
        const nestedIntersection = this.formatUnionOrIntersection(
          prop.type,
          expanded,
          depth + 1,
          "[Intersection]",
          propDeclaration.length
        );

        return `${propDeclIndent}${nestedIntersection};`;
      } else if (prop.type.type === "array") {
        console.log(`✓ ${prop.name}을 배열 타입으로 처리`);
        // 배열 타입인 경우: 프로퍼티 선언 위치에 맞춰 들여쓰기
        const nestedArray = this.formatStructure(
          prop.type,
          expanded,
          depth + 1,
          propDeclaration.length
        );

        return `${propDeclIndent}${nestedArray};`;
      } else {
        console.log(`✓ ${prop.name}을 기본 타입으로 처리 (${prop.type.type})`);
        // 기본 타입인 경우: 기본 포맷팅
        const propType = this.formatStructure(prop.type, expanded, 0, 0).trim();
        return `${propIndent}${readonly}${prop.name}${optional}: ${propType};`;
      }
    });

    return `${header}\n${properties.join("\n")}\n${braceIndent}${footer}`;
  }

  private getIndent(depth: number): string {
    if (depth === 0) return "";
    return (
      " ".repeat((depth - 1) * this.INDENT_SIZE) +
      "|" +
      "-".repeat(this.INDENT_SIZE + 1)
    );
  }

  // 새로 추가된 메서드: 프로퍼티 이름 오프셋을 고려한 들여쓰기
  private getIndentWithOffset(depth: number, offset: number): string {
    const baseIndent = this.getIndent(depth);
    if (offset === 0) return baseIndent;

    // 오프셋만큼 추가 공백 추가
    return baseIndent + " ".repeat(offset);
  }
}
