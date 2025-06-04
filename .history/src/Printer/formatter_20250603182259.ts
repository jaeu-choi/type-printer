import { TypeInfo, TypeStructure, PrintOptions } from "./types";

export class TypeFormatter {
  private readonly DEFAULT_WIDTH = 50;

  format(info: TypeInfo, options?: PrintOptions): string {
    const expanded = options?.expanded || false;
    const separator = "=".repeat(this.calculateOptimalWidth(info));
    const header = this.formatHeader(info.name, info.originalSource);

    let body: string;

    if (expanded) {
      // expanded 모드: 트리 스타일로 Process + Result 표시
      body = this.formatExpandedTreeView(info.structure, info.name);
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
      return this.formatTreeStructure(structure.computedResult, false, 0);
    }

    if (structure.metadata?.finalTypeString) {
      return structure.metadata.finalTypeString;
    }

    return this.formatTreeStructure(structure, false, 0);
  }

  private formatExpandedTreeView(
    structure: TypeStructure,
    typeName: string
  ): string {
    const parts: string[] = [];

    // Process 섹션
    if (structure.children && structure.children.length > 0) {
      parts.push("┌─ [Process]");
      structure.children.forEach((child, index) => {
        const isLast = index === structure.children!.length - 1;
        const processContent = this.formatTreeStructure(
          child,
          true,
          1,
          isLast && !structure.computedResult,
          "│   "
        );
        this.addWithPrefix(parts, processContent, "│   ");
      });

      // Process와 Result 사이 연결선
      if (structure.computedResult) {
        parts.push("│");
      }
    }

    // Result 섹션
    parts.push("└─ [Result]");
    if (structure.computedResult) {
      const resultContent = this.formatTreeStructure(
        structure.computedResult,
        true,
        1,
        true,
        "    "
      );
      this.addWithPrefix(parts, resultContent, "    ");
    } else if (structure.metadata?.finalTypeString) {
      parts.push(`    ${structure.metadata.finalTypeString}`);
    } else {
      const resultContent = this.formatTreeStructure(
        structure,
        true,
        1,
        true,
        "    "
      );
      this.addWithPrefix(parts, resultContent, "    ");
    }

    return parts.join("\n");
  }

  private formatTreeStructure(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    isLastInParent: boolean = false,
    currentPrefix: string = ""
  ): string {
    switch (structure.type) {
      case "primitive":
        return structure.value || "unknown";

      case "literal":
        return structure.value || "unknown";

      case "operator":
        const operatorType = structure.metadata?.operator || "unknown";
        if (expanded && structure.children && structure.children.length > 0) {
          const lines = [`${operatorType}`];
          structure.children.forEach((child, index) => {
            const isLast = index === structure.children!.length - 1;
            const childContent = this.formatTreeStructure(
              child,
              expanded,
              depth + 1,
              isLast,
              this.getChildPrefix(currentPrefix, isLast)
            );
            const prefix = isLast ? "└─" : "├─";
            lines.push(`${prefix} ${childContent}`);
          });
          return this.joinWithPrefix(lines, currentPrefix);
        }
        return operatorType;

      case "reference":
        const refName = structure.name || "unknown";
        const typeArgs = structure.metadata?.typeArgs?.length
          ? `<${structure.metadata.typeArgs.join(", ")}>`
          : "";

        if (expanded && structure.children && structure.children.length > 0) {
          const lines = [`${refName}${typeArgs}`];
          structure.children.forEach((child, index) => {
            const isLast = index === structure.children!.length - 1;
            const childContent = this.formatTreeStructure(
              child,
              expanded,
              depth + 1,
              isLast,
              this.getChildPrefix(currentPrefix, isLast)
            );
            const prefix = isLast ? "└─" : "├─";
            lines.push(`${prefix} ${childContent}`);
          });
          return this.joinWithPrefix(lines, currentPrefix);
        }
        return `${refName}${typeArgs}`;

      case "union":
        return this.formatUnionTree(structure, expanded, depth, currentPrefix);

      case "intersection":
        return this.formatIntersectionTree(
          structure,
          expanded,
          depth,
          currentPrefix
        );

      case "array":
        if (expanded && structure.children && structure.children.length > 0) {
          const elementContent = this.formatTreeStructure(
            structure.children[0],
            expanded,
            depth + 1,
            true,
            this.getChildPrefix(currentPrefix, true)
          );
          const lines = ["array", `└─ ${elementContent}`];
          return this.joinWithPrefix(lines, currentPrefix);
        }
        return "array";

      case "object":
        return this.formatObjectTree(structure, expanded, depth, currentPrefix);
      case "function":
        return this.formatFunctionTree(
          structure,
          expanded,
          depth,
          currentPrefix
        );
      case "mapped":
        return this.formatMappedTree(structure, expanded, depth, currentPrefix);

      default:
        return structure.metadata?.originalText || "unknown";
    }
  }

  private formatUnionTree(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    if (!structure.children || structure.children.length === 0) {
      return "union";
    }

    const lines = ["union"];
    structure.children.forEach((child, index) => {
      const isLast = index === structure.children!.length - 1;
      const childContent = this.formatTreeStructure(
        child,
        expanded,
        depth + 1,
        isLast,
        this.getChildPrefix(currentPrefix, isLast)
      );
      const prefix = isLast ? "└─" : "├─";
      lines.push(`${prefix} ${childContent}`);
    });

    return this.joinWithPrefix(lines, currentPrefix);
  }
  private formatFunctionTree(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    if (!structure.children || structure.children.length === 0) {
      return "function";
    }

    const lines = ["function"];
    structure.children.forEach((child, index) => {
      const isLast = index === structure.children!.length - 1;
      const childContent = this.formatTreeStructure(
        child,
        expanded,
        depth + 1,
        isLast,
        this.getChildPrefix(currentPrefix, isLast)
      );
      const prefix = isLast ? "└─" : "├─";
      lines.push(`${prefix} ${childContent}`);
    });

    return this.joinWithPrefix(lines, currentPrefix);
  }

  private formatIntersectionTree(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    if (!structure.children || structure.children.length === 0) {
      return "intersection";
    }

    const lines = ["intersection"];
    structure.children.forEach((child, index) => {
      const isLast = index === structure.children!.length - 1;
      const childContent = this.formatTreeStructure(
        child,
        expanded,
        depth + 1,
        isLast,
        this.getChildPrefix(currentPrefix, isLast)
      );
      const prefix = isLast ? "└─" : "├─";
      lines.push(`${prefix} ${childContent}`);
    });

    return this.joinWithPrefix(lines, currentPrefix);
  }

  private formatObjectTree(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    if (!structure.properties || structure.properties.length === 0) {
      return "object";
    }

    const lines = ["object"];
    structure.properties.forEach((prop, index) => {
      const isLast = index === structure.properties!.length - 1;
      const prefix = isLast ? "└─" : "├─";

      const optional = prop.optional ? "?" : "";
      const readonly = prop.readonly ? "readonly " : "";
      const propName = `${readonly}${prop.name}${optional}`;

      // 프로퍼티 타입 포맷팅
      const propTypeContent = this.formatTreeStructure(
        prop.type,
        expanded,
        depth + 1,
        true,
        this.getChildPrefix(currentPrefix, isLast)
      );

      // 프로퍼티가 복잡한 타입인 경우 (object, union, array 등)
      if (
        prop.type.type === "object" ||
        prop.type.type === "union" ||
        prop.type.type === "array" ||
        prop.type.type === "intersection"
      ) {
        lines.push(`${prefix} ${propName} : ${propTypeContent}`);
      } else {
        // 단순 타입인 경우 한 줄에 표시
        lines.push(`${prefix} ${propName} : ${propTypeContent}`);
      }
    });

    return this.joinWithPrefix(lines, currentPrefix);
  }

  // 🆕 헬퍼 메서드들 추가
  private addWithPrefix(
    parts: string[],
    content: string,
    prefix: string
  ): void {
    const lines = content.split("\n");
    lines.forEach((line) => {
      parts.push(`${prefix}${line}`);
    });
  }

  private joinWithPrefix(lines: string[], prefix: string): string {
    if (prefix === "") {
      return lines.join("\n");
    }

    return lines
      .map((line, index) => {
        if (index === 0) {
          return line; // 첫 번째 라인은 prefix 없이
        }
        return `${prefix}${line}`;
      })
      .join("\n");
  }

  private getChildPrefix(currentPrefix: string, isLastChild: boolean): string {
    if (isLastChild) {
      return currentPrefix + "    "; // 마지막 자식이면 공백만
    } else {
      return currentPrefix + "│   "; // 중간 자식이면 수직선 + 공백
    }
  }

  private calculateOptimalWidth(info: TypeInfo): number {
    const sourceWidth = info.originalSource.length;
    const estimatedWidth = Math.max(sourceWidth + 10, this.DEFAULT_WIDTH);
    return Math.min(estimatedWidth, 100);
  }

  private formatHeader(name: string, originalSource: string): string {
    const maxWidth = Math.max(originalSource.length + 4, 50);
    const padding = Math.max(0, maxWidth - originalSource.length - 2);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;

    return `|${" ".repeat(leftPad)}[Original]${" ".repeat(
      rightPad
    )}|\n| ${originalSource}${" ".repeat(
      maxWidth - originalSource.length - 3
    )}|`;
  }

  private formatMappedTree(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    if (!structure.children || structure.children.length === 0) {
      return "mapped";
    }

    const lines = ["mapped"];

    structure.children.forEach((child, index) => {
      const isLast = index === structure.children!.length - 1;
      const prefix = isLast ? "└─" : "├─";

      // 매핑된 타입의 특별한 구조들 처리
      if (child.name === "[MappingPattern]") {
        // 매핑 패턴은 간단히 표시
        const patternValue =
          child.children?.[0]?.value || child.value || "unknown pattern";
        lines.push(`${prefix} ${child.name}: ${patternValue}`);
      } else if (child.name === "[MappingIterations]") {
        // 매핑 반복들은 특별한 형태로 표시
        lines.push(`${prefix} ${child.name}:`);

        if (child.children && child.children.length > 0) {
          child.children.forEach((iteration, iterIndex) => {
            const iterIsLast = iterIndex === child.children!.length - 1;
            const iterPrefix = isLast ? "    " : "│   ";
            const iterConnector = iterIsLast ? "└─" : "├─";

            // Step 이름 추출 (예: "[Step: name]" → "name")
            const stepName =
              iteration.name?.match(/\[Step: (.+)\]/)?.[1] || "unknown";
            lines.push(`${iterPrefix}${iterConnector} ${stepName}:`);

            // K = "name", User[K] = string 형태로 표시
            if (iteration.children && iteration.children.length >= 2) {
              const keyValue = iteration.children[0].value || "unknown";
              const resultValue = iteration.children[1].value || "unknown";

              const stepPrefix = isLast ? "        " : "│       ";
              lines.push(`${stepPrefix}├─ ${keyValue}`);
              lines.push(`${stepPrefix}└─ ${resultValue}`);
            }
          });
        }
      } else if (child.name === "[Modifiers]") {
        // 수정자들은 간단히 표시
        lines.push(`${prefix} ${child.name}:`);

        if (child.children && child.children.length > 0) {
          child.children.forEach((modifier, modIndex) => {
            const modIsLast = modIndex === child.children!.length - 1;
            const modPrefix = isLast ? "    " : "│   ";
            const modConnector = modIsLast ? "└─" : "├─";

            const operatorType = modifier.metadata?.operator || "unknown";
            const modifierType = modifier.metadata?.modifier || "unknown";
            lines.push(
              `${modPrefix}${modConnector} ${operatorType}: ${modifierType}`
            );
          });
        }
      } else {
        // 기타 구조들은 기본 방식으로 처리
        const childContent = this.formatTreeStructure(
          child,
          expanded,
          depth + 1,
          isLast,
          this.getChildPrefix(currentPrefix, isLast)
        );
        lines.push(`${prefix} ${childContent}`);
      }
    });

    return this.joinWithPrefix(lines, currentPrefix);
  }
}
