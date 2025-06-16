// src/formatter.ts

import { TypeInfo, PrintOptions } from "./types";
import { TypeNode, TypeNodeKind, ObjectMember } from "./ir";

// formatter.ts 최상단에 추가
import { EducationalStep } from "./handlers/genericProcessor";
/**
 * 🎯 새로운 IR 시스템 기반 TypeFormatter
 *
 * 주요 변경사항:
 * - TypeStructure → TypeNode 사용
 * - structure.type → structure.kind
 * - structure.value → structure.literal
 * - structure.properties → structure.objectMembers
 */
export class TypeFormatter {
  private readonly DEFAULT_WIDTH = 50;

  format(info: TypeInfo, options?: PrintOptions, mappingInfo?: any): string {
    const expanded = options?.expanded || false;
    const separator = "=".repeat(this.calculateOptimalWidth(info));
    const header = this.formatHeader(info.name, info.originalSource);

    let body: string;

    if (expanded) {
      // 🆕 매핑 정보가 있으면 매핑 분석 모드
      if (mappingInfo) {
        body = this.formatMappingAnalysis(
          info.structure,
          info.name,
          mappingInfo
        );
      } else {
        body = this.formatExpandedTreeView(info.structure, info.name);
      }
    } else {
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

  private formatMappingAnalysis(
    structure: TypeNode,
    typeName: string,
    mappingInfo: any
  ): string {
    const parts: string[] = [];

    console.log(
      "🎯 formatMappingAnalysis called with iterations:",
      mappingInfo.iterations?.length || 0
    );

    parts.push(`┌─ [Mapped from]: ${mappingInfo.name}`);
    parts.push(`├─ [Pattern]: ${mappingInfo.pattern}`);

    // 타입 파라미터들 추가
    if (mappingInfo.typeParameters.length > 0) {
      parts.push(
        `├─ [Generic Parameters]: <${mappingInfo.typeParameters.join(", ")}>`
      );
    }

    // 타입 인자들 추가
    if (mappingInfo.typeArgs && mappingInfo.typeArgs.length > 0) {
      parts.push("├─ [Type Arguments]:");
      mappingInfo.typeArgs.forEach((arg: any, index: number) => {
        const isLast = index === mappingInfo.typeArgs.length - 1;
        const connector = isLast ? "└─" : "├─";
        parts.push(
          `│   ${connector} ${
            mappingInfo.typeParameters[index] || `Arg${index}`
          } = ${arg.name}`
        );
      });
    }

    // 🎯 핵심: 이터레이션 과정 표시
    if (mappingInfo.iterations && mappingInfo.iterations.length > 0) {
      parts.push("├─ [Process: Mapped Type Expansion]");
      parts.push("│   Iterations:");

      mappingInfo.iterations.forEach((iteration: any, index: number) => {
        const isLastIteration = index === mappingInfo.iterations.length - 1;
        const stepName =
          iteration.name?.replace(/\[Step: (.+)\]/, "$1") || "unknown";

        // 각 반복 단계의 헤더
        const iterConnector = isLastIteration ? "└─" : "├─";
        parts.push(`│     ${iterConnector} ${stepName}`);

        // 각 단계의 세부 과정 표시
        if (iteration.children && iteration.children.length >= 3) {
          const step1 = iteration.children[0].literal; // K = "ID"
          const step2 = iteration.children[1].literal; // T[K] = "id"
          const step3 = iteration.children[2].literal; // F[T[K]] = F["id"] = number

          const iterPrefix = isLastIteration ? "│         " : "│     │   ";
          parts.push(`${iterPrefix}${step1}`);
          parts.push(`${iterPrefix}${step2}`);
          parts.push(`${iterPrefix}${step3}`);
        }
      });

      parts.push("│");
    }

    parts.push("└─ [Final Result]");

    // 최종 결과 표시 - IR의 children 사용
    if (structure.children && structure.children.length > 0) {
      // computedResult 등가물 찾기
      const resultNode = this.findResultNode(structure);
      if (resultNode) {
        const resultLines = this.formatResultObject(resultNode, 4);
        resultLines.forEach((line) => {
          parts.push(`    ${line}`);
        });
      }
    } else {
      // 직접 결과 표시
      const resultLines = this.formatResultObject(structure, 4);
      resultLines.forEach((line) => {
        parts.push(`    ${line}`);
      });
    }

    return parts.join("\n");
  }

  private formatResultView(structure: TypeNode, typeName: string): string {
    // 🎯 IR 시스템에서는 computed result가 별도로 없고
    // structure 자체가 최종 결과임
    if (structure.metadata?.finalTypeString) {
      return structure.metadata.finalTypeString;
    }

    return this.formatTreeStructure(structure, false, 0);
  }

  private formatExpandedTreeView(
    structure: TypeNode,
    typeName: string
  ): string {
    // 🎯 특정 타입들은 formatTreeStructure에 완전 위임
    if (structure.kind === "mapped") {
      console.log("🎯 mapped 타입이므로 formatTreeStructure에 완전 위임!");
      return this.formatTreeStructure(structure, true, 0, true, "");
    }

    // 다른 타입들은 기존 Process/Result 패턴 사용
    const parts: string[] = [];

    // 🆕 제네릭 교육적 정보 우선 표시
    if (structure.metadata?.educationalSteps) {
      parts.push("┌─ [Generic Instantiation Process]");

      structure.metadata.educationalSteps.forEach((step, index) => {
        const isLast =
          index === structure.metadata!.educationalSteps!.length - 1;
        const connector = isLast ? "└─" : "├─";

        parts.push(`│   ${connector} ${step.description}`);

        // 세부 정보 표시
        if (step.details && typeof step.details === "object") {
          const detailKeys = Object.keys(step.details);
          detailKeys.forEach((key, detailIndex) => {
            const isLastDetail = detailIndex === detailKeys.length - 1;
            const detailConnector = isLastDetail ? "└─" : "├─";
            const prefix = isLast ? "    " : "│   ";

            parts.push(
              `│   ${prefix}  ${detailConnector} ${key}: ${step.details[key]}`
            );
          });
        }
      });

      parts.push("│");
    }
    // Process 섹션
    if (structure.children && structure.children.length > 0) {
      parts.push("┌─ [Process]");
      structure.children.forEach((child, index) => {
        const isLast = index === structure.children!.length - 1;
        // IR에서는 computedResult가 별도로 없으므로 항상 isLast를 계산
        const processContent = this.formatTreeStructure(
          child,
          true,
          1,
          isLast,
          "│   "
        );
        this.addWithPrefix(parts, processContent, "│   ");
      });

      parts.push("│");
    }

    // Result 섹션
    parts.push("└─ [Result]");

    if (structure.metadata?.finalTypeString) {
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
    structure: TypeNode,
    expanded: boolean,
    depth: number,
    isLastInParent: boolean = false,
    currentPrefix: string = ""
  ): string {
    // 🎯 IR 시스템의 TypeNodeKind에 맞게 switch 수정
    switch (structure.kind) {
      case "primitive":
        return structure.literal || "unknown";

      case "literal":
        return structure.literal || "unknown";

      case "operator":
        // IR에서는 name 필드에 operator 정보가 있음
        const operatorType = structure.name || "unknown";
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

        // 🎯 IR에서는 typeArguments 필드 사용
        const typeArgs = structure.typeArguments?.length
          ? `<${structure.typeArguments
              .map((arg) => arg.name || arg.literal || "unknown")
              .join(", ")}>`
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
        // 🎯 IR에서는 elementType 필드도 확인
        if (structure.elementType) {
          const elementContent = this.formatTreeStructure(
            structure.elementType,
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
        console.log(
          "🎯 formatTreeStructure에서 mapped case 실행됨!",
          structure
        );
        return this.formatMappedTree(structure, expanded, depth, currentPrefix);

      case "conditional":
        return this.formatConditionalTree(
          structure,
          expanded,
          depth,
          currentPrefix
        );

      case "template":
        return this.formatTemplateTree(
          structure,
          expanded,
          depth,
          currentPrefix
        );

      case "indexAccess":
        return this.formatIndexAccessTree(
          structure,
          expanded,
          depth,
          currentPrefix
        );

      case "utility":
        return this.formatUtilityTree(
          structure,
          expanded,
          depth,
          currentPrefix
        );

      case "unknown":
      default:
        return (
          structure.metadata?.originalText || structure.literal || "unknown"
        );
    }
  }

  private formatUnionTree(
    structure: TypeNode,
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
    structure: TypeNode,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    // 🎯 IR에서는 functionInfo 필드 확인
    if (structure.functionInfo) {
      const lines = ["function"];

      // 타입 매개변수
      if (
        structure.functionInfo.typeParameters &&
        structure.functionInfo.typeParameters.length > 0
      ) {
        lines.push("├─ [TypeParameters]");
        structure.functionInfo.typeParameters.forEach((tp, index) => {
          const isLast =
            index === structure.functionInfo!.typeParameters!.length - 1;
          const prefix = isLast ? "└─" : "├─";
          lines.push(`│   ${prefix} ${tp.name || tp.literal || "T"}`);
        });
      }

      // 매개변수들
      if (structure.functionInfo.parameters.length > 0) {
        lines.push("├─ [Parameters]");
        structure.functionInfo.parameters.forEach((param, index) => {
          const isLast =
            index === structure.functionInfo!.parameters.length - 1;
          const prefix = isLast ? "└─" : "├─";
          const optional = param.optional ? "?" : "";
          const rest = param.rest ? "..." : "";
          const paramType = param.type.name || param.type.literal || "unknown";
          lines.push(
            `│   ${prefix} ${rest}${param.name}${optional}: ${paramType}`
          );
        });
      }

      // 반환 타입
      lines.push("└─ [ReturnType]");
      const returnType =
        structure.functionInfo.returnType.name ||
        structure.functionInfo.returnType.literal ||
        "unknown";
      lines.push(`    ${returnType}`);

      return this.joinWithPrefix(lines, currentPrefix);
    }

    // fallback: children 사용
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
    structure: TypeNode,
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
    structure: TypeNode,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    // 🎯 IR에서는 objectMembers 필드 사용
    if (!structure.objectMembers || structure.objectMembers.length === 0) {
      return "object";
    }

    const lines = ["object"];
    structure.objectMembers.forEach((member, index) => {
      const isLast = index === structure.objectMembers!.length - 1;
      const prefix = isLast ? "└─" : "├─";

      const optional = member.optional ? "?" : "";
      const readonly = member.readonly ? "readonly " : "";
      const memberName = `${readonly}${member.key}${optional}`;

      // 멤버 타입 포맷팅
      const memberTypeContent = this.formatTreeStructure(
        member.node,
        expanded,
        depth + 1,
        true,
        this.getChildPrefix(currentPrefix, isLast)
      );

      // 멤버가 복잡한 타입인 경우 (object, union, array 등)
      if (
        member.node.kind === "object" ||
        member.node.kind === "union" ||
        member.node.kind === "array" ||
        member.node.kind === "intersection"
      ) {
        lines.push(`${prefix} ${memberName} : ${memberTypeContent}`);
      } else {
        // 단순 타입인 경우 한 줄에 표시
        lines.push(`${prefix} ${memberName} : ${memberTypeContent}`);
      }
    });

    return this.joinWithPrefix(lines, currentPrefix);
  }

  // 🆕 새로운 IR 타입들에 대한 포맷터 추가

  private formatConditionalTree(
    structure: TypeNode,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    if (structure.conditionalInfo) {
      const lines = ["conditional"];
      lines.push(
        "├─ [Check] " + (structure.conditionalInfo.checkType.name || "T")
      );
      lines.push(
        "├─ [Extends] " + (structure.conditionalInfo.extendsType.name || "U")
      );
      lines.push(
        "├─ [True] " + (structure.conditionalInfo.trueType.name || "X")
      );
      lines.push(
        "└─ [False] " + (structure.conditionalInfo.falseType.name || "Y")
      );
      return this.joinWithPrefix(lines, currentPrefix);
    }
    return "conditional";
  }

  private formatTemplateTree(
    structure: TypeNode,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    if (structure.templateLiteralInfo) {
      const lines = ["template"];
      if (structure.templateLiteralInfo.resolvedString) {
        lines.push(`└─ "${structure.templateLiteralInfo.resolvedString}"`);
      } else {
        lines.push("└─ template literal");
      }
      return this.joinWithPrefix(lines, currentPrefix);
    }
    return "template";
  }

  private formatIndexAccessTree(
    structure: TypeNode,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    if (structure.indexAccessInfo) {
      const lines = ["indexAccess"];
      const objectType = structure.indexAccessInfo.objectType.name || "T";
      const indexType =
        structure.indexAccessInfo.indexType.literal ||
        structure.indexAccessInfo.indexType.name ||
        "K";
      lines.push(`└─ ${objectType}[${indexType}]`);
      return this.joinWithPrefix(lines, currentPrefix);
    }
    return "indexAccess";
  }

  private formatUtilityTree(
    structure: TypeNode,
    expanded: boolean,
    depth: number,
    currentPrefix: string = ""
  ): string {
    const utilityName = structure.name || "utility";
    if (structure.children && structure.children.length > 0) {
      const lines = [utilityName];
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
    return utilityName;
  }

  private formatMappedTree(
    structure: TypeNode,
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

    // 데이터 추출 - IR 구조에 맞게 수정
    structure.children.forEach((child) => {
      if (child.name === "[MappingPattern]") {
        const patternValue = child.children?.[0]?.literal || "unknown pattern";
        mappingPattern = patternValue;
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

        const iterConnector = isLastIteration ? "└─" : "├─";
        lines.push(`│     ${iterConnector} ${stepName}`);

        if (iteration.children && iteration.children.length >= 2) {
          const keyValueRaw = iteration.children[0].literal || "unknown";
          const resultValueRaw = iteration.children[1].literal || "unknown";

          const keyMatch = keyValueRaw.match(/(\w+) = "(.+)"/);
          const paramName = keyMatch ? keyMatch[1] : "K";
          const keyValue = keyMatch ? keyMatch[2] : "unknown";

          let expression = "unknown";
          let resultType = "unknown";

          const equalIndex = resultValueRaw.lastIndexOf(" = ");
          if (equalIndex !== -1) {
            const originalPattern = mappingPattern;
            const patternMatch = originalPattern.match(
              /\[(.+) in (.+)\]: (.+)/
            );
            if (patternMatch) {
              const [, param, constraint, valueExpr] = patternMatch;
              const typeName = constraint.replace("keyof ", "");
              expression = `${typeName}[${param}]`;
            } else {
              expression = "ValueType";
            }

            resultType = resultValueRaw.substring(equalIndex + 3).trim();
          }

          const maxLabelWidth = Math.min(
            15,
            Math.max(paramName.length, expression.length)
          );
          const paramPadding = " ".repeat(
            Math.max(0, maxLabelWidth - paramName.length)
          );
          const exprPadding = " ".repeat(
            Math.max(0, maxLabelWidth - expression.length)
          );

          const iterPrefix = isLastIteration ? "│         " : "│     │   ";

          lines.push(
            `${iterPrefix}${paramName}${paramPadding} = "${keyValue}"`
          );

          if (resultType.length > 80) {
            lines.push(`${iterPrefix}${expression}${exprPadding} =`);
            const indentedType = this.formatLongType(
              resultType,
              iterPrefix + "  "
            );
            lines.push(indentedType);
          } else {
            lines.push(
              `${iterPrefix}${expression}${exprPadding} = ${resultType}`
            );
          }
        }
      });
    }

    lines.push("│");
    lines.push("└─ [Result Object]");

    // 결과 표시 - IR에서는 children이나 자체 구조 확인
    const resultLines = this.formatResultObject(structure, 4);
    resultLines.forEach((line) => {
      lines.push(`    ${line}`);
    });

    return this.joinWithPrefix(lines, currentPrefix);
  }

  // 🔧 헬퍼 메서드들

  private findResultNode(structure: TypeNode): TypeNode | null {
    // IR에서는 computedResult가 별도로 없으므로
    // children 중에서 결과를 나타내는 노드를 찾아야 함
    if (structure.children) {
      // "[Result]" 같은 이름을 가진 노드 찾기
      const resultNode = structure.children.find(
        (child) =>
          child.name?.includes("[Result]") || child.name?.includes("Result")
      );
      return resultNode || structure.children[structure.children.length - 1];
    }
    return structure;
  }

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
          return line;
        }
        return `${prefix}${line}`;
      })
      .join("\n");
  }

  private getChildPrefix(currentPrefix: string, isLastChild: boolean): string {
    if (isLastChild) {
      return currentPrefix + "    ";
    } else {
      return currentPrefix + "│   ";
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

  private formatLongType(typeString: string, baseIndent: string): string {
    if (typeString.includes("{") && typeString.includes("}")) {
      return typeString
        .replace(/{\s*/g, "{\n" + baseIndent + "  ")
        .replace(/;\s*/g, ";\n" + baseIndent + "  ")
        .replace(/\s*}/g, "\n" + baseIndent + "}");
    }
    return baseIndent + typeString;
  }

  private formatResultObject(
    structure: TypeNode,
    indent: number = 0
  ): string[] {
    const indentStr = " ".repeat(indent);

    // 🎯 IR의 objectMembers 사용
    if (structure.kind === "object" && structure.objectMembers) {
      const lines = ["{"];

      const maxNameLength = Math.max(
        ...structure.objectMembers.map((m) => m.key.length)
      );

      structure.objectMembers.forEach((member, index) => {
        const isLast = index === structure.objectMembers!.length - 1;
        const comma = isLast ? "" : ",";
        const padding = " ".repeat(maxNameLength - member.key.length);

        let typeStr = "";
        if (
          member.node.kind === "primitive" ||
          member.node.kind === "literal"
        ) {
          typeStr = member.node.literal || "unknown";
        } else if (member.node.kind === "union" && member.node.children) {
          const unionTypes = member.node.children.map(
            (child) => child.literal || "unknown"
          );
          typeStr = unionTypes.join(" | ");
        } else if (member.node.kind === "object") {
          typeStr = "{ ... }";
        } else {
          typeStr = member.node.metadata?.finalTypeString || "unknown";
        }

        const optional = member.optional ? "?" : "";
        const readonly = member.readonly ? "readonly " : "";

        lines.push(
          `  ${readonly}${member.key}${optional}${padding} : ${typeStr}${comma}`
        );
      });

      lines.push("}");
      return lines;
    } else if (structure.kind === "union" && structure.children) {
      const unionTypes = structure.children.map(
        (child) => child.literal || "unknown"
      );
      return [unionTypes.join(" | ")];
    } else {
      return [
        structure.literal || structure.metadata?.finalTypeString || "unknown",
      ];
    }
  }

  // 🆕 제네릭 전용 포맷팅 메서드 추가
  private formatGenericInstantiationSteps(
    steps: EducationalStep[],
    currentPrefix: string = ""
  ): string[] {
    const lines: string[] = [];

    steps.forEach((step, index) => {
      const isLast = index === steps.length - 1;
      const connector = isLast ? "└─" : "├─";

      // 단계 제목
      lines.push(
        `${currentPrefix}${connector} [${this.formatStepType(step.type)}]`
      );
      lines.push(
        `${currentPrefix}${isLast ? "    " : "│   "}${step.description}`
      );

      // 입력/출력 정보
      if (step.input) {
        lines.push(
          `${currentPrefix}${isLast ? "    " : "│   "}Input: ${step.input}`
        );
      }
      if (step.output) {
        lines.push(
          `${currentPrefix}${isLast ? "    " : "│   "}Output: ${step.output}`
        );
      }

      // 세부 정보
      if (step.details) {
        const detailLines = this.formatStepDetails(step.details);
        detailLines.forEach((detailLine) => {
          lines.push(
            `${currentPrefix}${isLast ? "    " : "│   "}${detailLine}`
          );
        });
      }
    });

    return lines;
  }

  private formatStepType(type: string): string {
    const typeMap: Record<string, string> = {
      "generic-detection": "Generic Detection",
      "definition-lookup": "Definition Lookup",
      "parameter-mapping": "Parameter Mapping",
      "instantiation-start": "Instantiation Start",
    };

    return typeMap[type] || type;
  }

  private formatStepDetails(details: any): string[] {
    const lines: string[] = [];

    if (typeof details === "object" && details !== null) {
      Object.entries(details).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          lines.push(`${key}: [${value.join(", ")}]`);
        } else if (typeof value === "object") {
          lines.push(`${key}: ${JSON.stringify(value)}`);
        } else {
          lines.push(`${key}: ${value}`);
        }
      });
    }

    return lines;
  }
}
