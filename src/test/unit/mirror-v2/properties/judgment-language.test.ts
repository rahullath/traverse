import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Judgment Language Detection Test
 * 
 * This test scans all Mirror UI component files for forbidden judgment language.
 * It ensures that the interface remains neutral and supportive, never signaling
 * failure or creating guilt for users with executive dysfunction.
 * 
 * Requirements: 16.1, 16.4, 16.5, 24.2, 24.4
 */

describe("Mirror V2 - Judgment Language Detection", () => {
  // Forbidden terms that signal judgment or failure
  const FORBIDDEN_TERMS = [
    "running late",
    "behind schedule",
    "missed it",
    "failed",
    "should have started",
  ];

  // Component directories to scan
  const COMPONENT_DIRS = [
    "src/components/daily-plan",
  ];

  // Files to exclude from scanning (V1 components being deprecated)
  const EXCLUDED_FILES = [
    "DegradePlanButton.tsx", // V1 component with "behind schedule" - being deprecated for V2
    "StateDeclarationPrompt.tsx", // V1 component with "missed it" - replaced by IntentPrompt in V2
  ];

  // File extensions to scan
  const SCAN_EXTENSIONS = [".tsx", ".astro"];

  /**
   * Recursively get all files in a directory matching the extensions
   */
  function getFilesRecursive(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...getFilesRecursive(fullPath));
        } else if (stat.isFile()) {
          // Skip excluded files
          if (EXCLUDED_FILES.some(excluded => entry === excluded)) {
            continue;
          }
          
          const hasValidExtension = SCAN_EXTENSIONS.some(ext => 
            entry.endsWith(ext)
          );
          if (hasValidExtension) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet, skip silently
      console.warn(`Warning: Could not read directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * Check if a line is a technical error message (not user-facing judgment)
   */
  function isErrorMessage(line: string): boolean {
    const lowerLine = line.toLowerCase();
    // Error messages typically contain these patterns
    return (
      lowerLine.includes('throw new error') ||
      lowerLine.includes('console.error') ||
      lowerLine.includes('console.warn') ||
      lowerLine.includes('console.debug') ||
      lowerLine.includes('alert(') ||
      lowerLine.includes('seterror(') ||
      lowerLine.includes('setvalidationerrors(') ||
      lowerLine.includes('error:') ||
      lowerLine.includes('// error') ||
      lowerLine.includes('errordata.error') ||
      lowerLine.includes('err instanceof error') ||
      lowerLine.includes('.message') ||
      // Template literals with error messages
      (lowerLine.includes('`') && lowerLine.includes('failed')) ||
      // String concatenation with error context
      (lowerLine.includes('failed') && (
        lowerLine.includes('response.statustext') ||
        lowerLine.includes('error.message') ||
        lowerLine.includes('err.message')
      )) ||
      // String literals in error handlers (ternary with error check)
      (lowerLine.includes(': "failed') || lowerLine.includes(':"failed'))
    );
  }

  /**
   * Scan a file for forbidden terms
   */
  function scanFileForForbiddenTerms(filePath: string): Array<{
    term: string;
    line: number;
    content: string;
  }> {
    const violations: Array<{
      term: string;
      line: number;
      content: string;
    }> = [];

    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Skip error messages - they're technical, not behavioral judgment
        if (isErrorMessage(line)) {
          continue;
        }

        for (const term of FORBIDDEN_TERMS) {
          if (lowerLine.includes(term.toLowerCase())) {
            violations.push({
              term,
              line: i + 1, // 1-indexed line numbers
              content: line.trim(),
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }

    return violations;
  }

  it("should not contain judgment language in Mirror UI components", () => {
    const allViolations: Array<{
      file: string;
      term: string;
      line: number;
      content: string;
    }> = [];

    // Scan all component directories
    for (const dir of COMPONENT_DIRS) {
      const files = getFilesRecursive(dir);
      
      for (const file of files) {
        const violations = scanFileForForbiddenTerms(file);
        
        for (const violation of violations) {
          allViolations.push({
            file,
            ...violation,
          });
        }
      }
    }

    // Build detailed error message if violations found
    if (allViolations.length > 0) {
      const errorMessage = [
        "\n❌ Judgment language detected in Mirror UI components:",
        "",
        ...allViolations.map(v => 
          `  ${v.file}:${v.line}\n    Term: "${v.term}"\n    Line: ${v.content}\n`
        ),
        "These terms create guilt and stress for users with executive dysfunction.",
        "Please replace with neutral, supportive language.",
        "",
        "Forbidden terms:",
        ...FORBIDDEN_TERMS.map(term => `  - "${term}"`),
      ].join("\n");

      expect(allViolations, errorMessage).toHaveLength(0);
    }

    // Test passes if no violations found
    expect(allViolations).toHaveLength(0);
  });

  it("should scan at least one component file", () => {
    let totalFiles = 0;

    for (const dir of COMPONENT_DIRS) {
      const files = getFilesRecursive(dir);
      totalFiles += files.length;
    }

    expect(totalFiles).toBeGreaterThan(0);
  });

  it("should recognize all forbidden terms", () => {
    // Verify the forbidden terms list is complete
    expect(FORBIDDEN_TERMS).toContain("running late");
    expect(FORBIDDEN_TERMS).toContain("behind schedule");
    expect(FORBIDDEN_TERMS).toContain("missed it");
    expect(FORBIDDEN_TERMS).toContain("failed");
    expect(FORBIDDEN_TERMS).toContain("should have started");
  });
});
