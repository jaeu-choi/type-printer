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
    )}`;
  }

  // private formatMappedTree(
  //   structure: TypeStructure,
  //   expanded: boolean,
  //   depth: number,
  //   currentPrefix: string = ""
  // ): string {
  //   if (!structure.children || structure.children.length === 0) {
  //     return "mapped";
  //   }

  //   const lines = ["mapped"];
  //   let mappingPattern = "";
  //   let iterations: any[] = [];

  //   // 데이터 추출
  //   structure.children.forEach((child) => {
  //     if (child.name === "[MappingPattern]") {
  //       const patternValue = child.children?.[0]?.value || "unknown pattern";
  //       // [K in keyof some]: some[K] → K in keyof some → some[K] 형태로 변환
  //       const match = patternValue.match(/\[(.+) in (.+)\]: (.+)/);
  //       if (match) {
  //         const [, param, constraint, valueType] = match;
  //         mappingPattern = `[${param} in ${constraint}] → ${valueType}`;
  //       } else {
  //         mappingPattern = patternValue;
  //       }
  //     } else if (child.name === "[MappingIterations]") {
  //       iterations = child.children || [];
  //     }
  //   });

  //   // Process 섹션 시작
  //   lines.push("┌─ [Process: Mapped Type Expansion]");
  //   lines.push(`│   Pattern       : ${mappingPattern}`);
  //   lines.push("│");

  //   if (iterations.length > 0) {
  //     lines.push("│   Iterations:");

  //     iterations.forEach((iteration, index) => {
  //       const isLastIteration = index === iterations.length - 1;
  //       const stepName =
  //         iteration.name?.match(/\[Step: (.+)\]/)?.[1] || "unknown";

  //       // 각 반복 단계의 헤더
  //       const iterConnector = isLastIteration ? "└─" : "├─";
  //       lines.push(`│     ${iterConnector} ${stepName}`);

  //       // K = value, TypeExpression = result 추출 및 정렬
  //       if (iteration.children && iteration.children.length >= 2) {
  //         const keyValueRaw = iteration.children[0].value || "unknown";
  //         const resultValueRaw = iteration.children[1].value || "unknown";

  //         // "K = \"name\"" → K, "name" 추출
  //         const keyMatch = keyValueRaw.match(/(\w+) = "(.+)"/);
  //         const paramName = keyMatch ? keyMatch[1] : "K";
  //         const keyValue = keyMatch ? keyMatch[2] : "unknown";

  //         // "some[K] = string" → "some[K]", "string" 추출
  //         const resultMatch = resultValueRaw.match(/(.+) = (.+)/);
  //         const expression = resultMatch ? resultMatch[1] : "unknown";
  //         const resultType = resultMatch ? resultMatch[2] : "unknown";

  //         // 정렬을 위한 패딩 계산 (monospace 기준)
  //         const maxLabelWidth = Math.max(paramName.length, expression.length);
  //         const paramPadding = " ".repeat(maxLabelWidth - paramName.length);
  //         const exprPadding = " ".repeat(maxLabelWidth - expression.length);

  //         const iterPrefix = isLastIteration ? "│         " : "│     │   ";
  //         lines.push(
  //           `${iterPrefix}${paramName}${paramPadding} = "${keyValue}"`
  //         );
  //         lines.push(
  //           `${iterPrefix}${expression}${exprPadding} = ${resultType}`
  //         );
  //       }
  //     });
  //   }

  //   lines.push("│");

  //   // Result 섹션
  //   lines.push("└─ [Result Object]");

  //   // computedResult가 있으면 예쁘게 포맷팅된 객체로 표시
  //   if (structure.computedResult) {
  //     const resultLines = this.formatResultObject(structure.computedResult, 4);
  //     resultLines.forEach((line) => {
  //       lines.push(`    ${line}`);
  //     });
  //   }

  //   return this.joinWithPrefix(lines, currentPrefix);
  // }

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
    let mappingPattern = "";
    let iterations: any[] = [];

    // 데이터 추출
    structure.children.forEach((child) => {
      if (child.name === "[MappingPattern]") {
        const patternValue = child.children?.[0]?.value || "unknown pattern";
        // [K in keyof some]: some[K] → K in keyof some → some[K] 형태로 변환
        const match = patternValue.match(/\[(.+) in (.+)\]: (.+)/);
        if (match) {
          const [, param, constraint, valueType] = match;
          mappingPattern = `[${param} in ${constraint}] → ${valueType}`;
        } else {
          mappingPattern = patternValue;
        }
      } else if (child.name === "[MappingIterations]") {
        iterations = child.children || [];
      }
    });

    // Process 섹션 시작
    lines.push("┌─ [Process: Mapped Type Expansion]");
    lines.push(`│   Pattern       : ${mappingPattern}`);
    lines.push("│");

    if (iterations.length > 0) {
      lines.push("│   Iterations:");

      iterations.forEach((iteration, index) => {
        const isLastIteration = index === iterations.length - 1;
        const stepName =
          iteration.name?.match(/\[Step: (.+)\]/)?.[1] || "unknown";

        // 각 반복 단계의 헤더
        const iterConnector = isLastIteration ? "└─" : "├─";
        lines.push(`│     ${iterConnector} ${stepName}`);

        // K = value, TypeExpression = result 추출 및 정렬
        if (iteration.children && iteration.children.length >= 2) {
          const keyValueRaw = iteration.children[0].value || "unknown";
          const resultValueRaw = iteration.children[1].value || "unknown";

          // "K = \"name\"" → K, "name" 추출
          const keyMatch = keyValueRaw.match(/(\w+) = "(.+)"/);
          const paramName = keyMatch ? keyMatch[1] : "K";
          const keyValue = keyMatch ? keyMatch[2] : "unknown";

          // "some[K] = string" → "some[K]", "string" 추출
          const resultMatch = resultValueRaw.match(/(.+) = (.+)/);
          const expression = resultMatch ? resultMatch[1] : "unknown";
          let resultType = resultMatch ? resultMatch[2] : "unknown";

          // 🔧 여러 줄 문자열 들여쓰기 처리
          if (resultType.includes("\n")) {
            const resultLines = resultType.split("\n");
            const baseIndent = isLastIteration ? "│         " : "│     │   ";
            const typeIndent = " ".repeat(expression.length + 3); // " = " 길이 포함

            resultType = resultLines
              .map((line: string, lineIndex: number) => {
                if (lineIndex === 0) {
                  return line.trim(); // 첫 번째 줄은 그대로
                }
                return `\n${baseIndent}${typeIndent}${line.trim()}`;
              })
              .join("");
          }

          // 정렬을 위한 패딩 계산 (monospace 기준)
          const maxLabelWidth = Math.max(paramName.length, expression.length);
          const paramPadding = " ".repeat(maxLabelWidth - paramName.length);
          const exprPadding = " ".repeat(maxLabelWidth - expression.length);

          const iterPrefix = isLastIteration ? "│         " : "│     │   ";
          lines.push(
            `${iterPrefix}${paramName}${paramPadding} = "${keyValue}"`
          );
          lines.push(
            `${iterPrefix}${expression}${exprPadding} = ${resultType}`
          );
        }
      });
    }

    lines.push("│");

    // Result 섹션
    lines.push("└─ [Result Object]");

    // computedResult가 있으면 예쁘게 포맷팅된 객체로 표시
    if (structure.computedResult) {
      const resultLines = this.formatResultObject(structure.computedResult, 4);
      resultLines.forEach((line) => {
        lines.push(`    ${line}`);
      });
    }

    return this.joinWithPrefix(lines, currentPrefix);
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
    let mappingPattern = "";
    let iterations: any[] = [];

    // 데이터 추출
    structure.children.forEach((child) => {
      if (child.name === "[MappingPattern]") {
        const patternValue = child.children?.[0]?.value || "unknown pattern";
        // [K in keyof some]: some[K] → K in keyof some → some[K] 형태로 변환
        const match = patternValue.match(/\[(.+) in (.+)\]: (.+)/);
        if (match) {
          const [, param, constraint, valueType] = match;
          mappingPattern = `[${param} in ${constraint}] → ${valueType}`;
        } else {
          mappingPattern = patternValue;
        }
      } else if (child.name === "[MappingIterations]") {
        iterations = child.children || [];
      }
    });

    // Process 섹션 시작
    lines.push("┌─ [Process: Mapped Type Expansion]");
    lines.push(`│   Pattern       : ${mappingPattern}`);
    lines.push("│");

    if (iterations.length > 0) {
      lines.push("│   Iterations:");

      iterations.forEach((iteration, index) => {
        const isLastIteration = index === iterations.length - 1;
        const stepName =
          iteration.name?.match(/\[Step: (.+)\]/)?.[1] || "unknown";

        // 각 반복 단계의 헤더
        const iterConnector = isLastIteration ? "└─" : "├─";
        lines.push(`│     ${iterConnector} ${stepName}`);

        // K = value, TypeExpression = result 추출 및 정렬
        if (iteration.children && iteration.children.length >= 2) {
          const keyValueRaw = iteration.children[0].value || "unknown";
          const resultValueRaw = iteration.children[1].value || "unknown";

          // "K = \"name\"" → K, "name" 추출
          const keyMatch = keyValueRaw.match(/(\w+) = "(.+)"/);
          const paramName = keyMatch ? keyMatch[1] : "K";
          const keyValue = keyMatch ? keyMatch[2] : "unknown";

          // "some[K] = string" → "some[K]", "string" 추출
          const resultMatch = resultValueRaw.match(/(.+) = (.+)/);
          const expression = resultMatch ? resultMatch[1] : "unknown";
          let resultType = resultMatch ? resultMatch[2] : "unknown";

          // 🔧 여러 줄 문자열 들여쓰기 처리
          if (resultType.includes("\n")) {
            const resultLines = resultType.split("\n");
            const baseIndent = isLastIteration ? "│         " : "│     │   ";
            const typeIndent = " ".repeat(expression.length + 3); // " = " 길이 포함

            resultType = resultLines
              .map((line: string, lineIndex: number) => {
                if (lineIndex === 0) {
                  return line.trim(); // 첫 번째 줄은 그대로
                }
                return `\n${baseIndent}${typeIndent}${line.trim()}`;
              })
              .join("");
          }

          // 정렬을 위한 패딩 계산 (monospace 기준)
          const maxLabelWidth = Math.max(paramName.length, expression.length);
          const paramPadding = " ".repeat(maxLabelWidth - paramName.length);
          const exprPadding = " ".repeat(maxLabelWidth - expression.length);

          const iterPrefix = isLastIteration ? "│         " : "│     │   ";
          lines.push(
            `${iterPrefix}${paramName}${paramPadding} = "${keyValue}"`
          );
          lines.push(
            `${iterPrefix}${expression}${exprPadding} = ${resultType}`
          );
        }
      });
    }

    lines.push("│");

    // Result 섹션
    lines.push("└─ [Result Object]");

    // computedResult가 있으면 예쁘게 포맷팅된 객체로 표시
    if (structure.computedResult) {
      const resultLines = this.formatResultObject(structure.computedResult, 4);
      resultLines.forEach((line) => {
        lines.push(`    ${line}`);
      });
    }

    return this.joinWithPrefix(lines, currentPrefix);
  } // 결과 객체를 예쁘게 포맷팅하는 헬퍼 메서드 추가
  private formatResultObject(
    structure: TypeStructure,
    indent: number = 0
  ): string[] {
    const indentStr = " ".repeat(indent);

    if (structure.type === "object" && structure.properties) {
      const lines = ["{"];

      // 프로퍼티 이름의 최대 길이 계산 (정렬용)
      const maxNameLength = Math.max(
        ...structure.properties.map((p) => p.name.length)
      );

      structure.properties.forEach((prop, index) => {
        const isLast = index === structure.properties!.length - 1;
        const comma = isLast ? "" : ",";
        const padding = " ".repeat(maxNameLength - prop.name.length);

        // 프로퍼티 타입을 한 줄로 변환
        let typeStr = "";
        if (prop.type.type === "primitive" || prop.type.type === "literal") {
          typeStr = prop.type.value || "unknown";
        } else if (prop.type.type === "union" && prop.type.children) {
          const unionTypes = prop.type.children.map(
            (child) => child.value || "unknown"
          );
          typeStr = unionTypes.join(" | ");
        } else if (prop.type.type === "object") {
          // 중첩 객체는 한 줄로 축약
          typeStr = "{ ... }";
        } else {
          typeStr = prop.type.metadata?.finalTypeString || "unknown";
        }

        const optional = prop.optional ? "?" : "";
        const readonly = prop.readonly ? "readonly " : "";

        lines.push(
          `  ${readonly}${prop.name}${optional}${padding} : ${typeStr}${comma}`
        );
      });

      lines.push("}");
      return lines;
    } else if (structure.type === "union" && structure.children) {
      const unionTypes = structure.children.map(
        (child) => child.value || "unknown"
      );
      return [unionTypes.join(" | ")];
    } else {
      return [
        structure.value || structure.metadata?.finalTypeString || "unknown",
      ];
    }
  }
}
