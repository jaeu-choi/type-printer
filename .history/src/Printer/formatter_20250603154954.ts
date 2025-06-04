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
          isLast && !structure.computedResult
        );
        parts.push(`│   ${processContent}`);
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
        true
      );
      parts.push(`    ${resultContent}`);
    } else if (structure.metadata?.finalTypeString) {
      parts.push(`    ${structure.metadata.finalTypeString}`);
    } else {
      const resultContent = this.formatTreeStructure(structure, true, 1, true);
      parts.push(`    ${resultContent}`);
    }

    return parts.join("\n");
  }

  private formatTreeStructure(
    structure: TypeStructure,
    expanded: boolean,
    depth: number,
    isLastInParent: boolean = false
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
              isLast
            );
            const prefix = isLast ? "└─" : "├─";
            lines.push(`${prefix} ${childContent}`);
          });
          return lines.join("\n");
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
              isLast
            );
            const prefix = isLast ? "└─" : "├─";
            lines.push(`${prefix} ${childContent}`);
          });
          return lines.join("\n");
        }
        return `${refName}${typeArgs}`;

      case "union":
        return this.formatUnionTree(structure, expanded, depth);

      case "intersection":
        return this.formatIntersectionTree(structure, expanded, depth);

      case "array":
        if (expanded && structure.children && structure.children.length > 0) {
          const elementContent = this.formatTreeStructure(
            structure.children[0],
            expanded,
            depth + 1,
            true
          );
          return `array\n└─ ${elementContent}`;
        }
        return "array";

      case "object":
        return this.formatObjectTree(structure, expanded, depth);

      default:
        return structure.metadata?.originalText || "unknown";
    }
  }

  private formatUnionTree(
    structure: TypeStructure,
    expanded: boolean,
    depth: number
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
        isLast
      );
      const prefix = isLast ? "└─" : "├─";
      lines.push(`${prefix} ${childContent}`);
    });

    return lines.join("\n");
  }

  private formatIntersectionTree(
    structure: TypeStructure,
    expanded: boolean,
    depth: number
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
        isLast
      );
      const prefix = isLast ? "└─" : "├─";
      lines.push(`${prefix} ${childContent}`);
    });

    return lines.join("\n");
  }

  private formatObjectTree(
    structure: TypeStructure,
    expanded: boolean,
    depth: number
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
        true
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

    return lines.join("\n");
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
}
