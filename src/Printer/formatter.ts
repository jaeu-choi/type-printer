import { TypeInfo, TypeStructure } from "./types";

export class TypeFormatter {
  private readonly DEFAULT_WIDTH = 50;
  private readonly INDENT_SIZE = 2;

  format(
    info: TypeInfo,
    style: "tree" | "compact" | "expanded" = "tree"
  ): string {
    const separator = "=".repeat(this.calculateOptimalWidth(info));
    const header = this.formatHeader(info.name, info.originalSource);
    const body = this.formatStructure(info.structure, style, 0);

    return [
      separator,
      header,
      separator,
      `${info.name}:`,
      body,
      separator,
    ].join("\n");
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
    style: string,
    depth: number
  ): string {
    const indent = this.getIndent(depth);

    switch (structure.type) {
      case "primitive":
        return `${indent}${structure.value}`;

      case "literal":
        return `${indent}${structure.value}`;

      case "operator":
        const operatorHeader = `${indent}[${structure.metadata?.operator}]`;
        if (structure.children && structure.children.length > 0) {
          const childFormatted = this.formatStructure(
            structure.children[0],
            style,
            depth + 1
          );
          return `${operatorHeader}\n${childFormatted}`;
        }
        return operatorHeader;

      case "access":
        const accessHeader = `${indent}[IndexedAccess]`;
        if (structure.children && structure.children.length >= 2) {
          const objFormatted = this.formatStructure(
            structure.children[0],
            style,
            depth + 1
          );
          const indexFormatted = this.formatStructure(
            structure.children[1],
            style,
            depth + 1
          );
          return `${accessHeader}\n${objFormatted}\n${indexFormatted}`;
        }
        return accessHeader;

      case "conditional":
        const condHeader = `${indent}[Conditional]`;
        if (structure.children && structure.children.length >= 4) {
          const parts = structure.children.map((child, i) => {
            const labels = ["Check", "Extends", "True", "False"];
            return `${indent}  [${labels[i]}]\n${this.formatStructure(
              child,
              style,
              depth + 2
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

        if (structure.children && structure.children.length > 0) {
          const childrenFormatted = structure.children
            .map((child) => this.formatStructure(child, style, depth + 1))
            .join("\n");
          return `${refHeader}\n${childrenFormatted}`;
        }
        return refHeader;

      case "union":
        return this.formatUnionOrIntersection(
          structure,
          style,
          depth,
          "[Union]"
        );

      case "intersection":
        return this.formatUnionOrIntersection(
          structure,
          style,
          depth,
          "[Intersection]"
        );

      case "array":
        const arrayHeader = `${indent}Array`;
        if (structure.children && structure.children.length > 0) {
          const elementFormatted = this.formatStructure(
            structure.children[0],
            style,
            depth + 1
          );
          return `${arrayHeader}\n${elementFormatted}`;
        }
        return arrayHeader;

      case "object":
        return this.formatObject(structure, style, depth);

      default:
        return `${indent}${structure.metadata?.originalText || "Unknown"}`;
    }
  }

  private formatUnionOrIntersection(
    structure: TypeStructure,
    style: string,
    depth: number,
    label: string
  ): string {
    const indent = this.getIndent(depth);
    const header = `${indent}${label}`;

    if (!structure.children || structure.children.length === 0) {
      return header;
    }

    const childrenFormatted = structure.children
      .map((child) => this.formatStructure(child, style, depth + 1))
      .join("\n");

    return `${header}\n${childrenFormatted}`;
  }

  private formatObject(
    structure: TypeStructure,
    style: string,
    depth: number
  ): string {
    const braceIndent = this.getIndent(depth);
    const propIndent = this.getIndent(depth + 1);

    if (!structure.properties || structure.properties.length === 0) {
      return `${braceIndent}{}`;
    }

    const header = `${braceIndent}{`;
    const footer = `${braceIndent}}`;

    const properties = structure.properties.map((prop) => {
      const optional = prop.optional ? "?" : "";
      const readonly = prop.readonly ? "readonly " : "";
      const propType = this.formatStructure(prop.type, style, 0).trim();

      return `${propIndent}${readonly}${prop.name}${optional}: ${propType};`;
    });

    return `${header}\n${properties.join("\n")}\n${footer}`;
  }

  private getIndent(depth: number): string {
    if (depth === 0) return "";
    return (
      " ".repeat((depth - 1) * this.INDENT_SIZE) +
      "|" +
      "-".repeat(this.INDENT_SIZE + 1)
    );
  }
}