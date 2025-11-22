#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * Debug script to see which ESLint plugins and rules are active
 */
import { ESLint } from "eslint";

/**
 * Check if a rule is active (not off or 0)
 */
function isRuleActive(ruleValue) {
  const level = Array.isArray(ruleValue) ? ruleValue[0] : ruleValue;
  return level !== "off" && level !== 0;
}

/**
 * Get active rules from config
 */
function getActiveRules(config) {
  return Object.entries(config.rules || {})
    .filter(([_, value]) => isRuleActive(value))
    .map(([name]) => name);
}

/**
 * Check if a rule is type-aware
 */
function isTypeAwareRule(ruleName) {
  const typeAwarePatterns = [
    "type-",
    "await",
    "promise",
    "no-floating-promises",
    "no-misused-promises",
    "require-await",
  ];
  return typeAwarePatterns.some(pattern => ruleName.includes(pattern));
}

/**
 * Get type-aware rules from active rules
 */
function getTypeAwareRules(activeRules) {
  return activeRules.filter(isTypeAwareRule);
}

/**
 * Print section header
 */
function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

async function debugESLint() {
  const eslint = new ESLint();
  const config = await eslint.calculateConfigForFile("eslint.config.ts");

  printSection("ACTIVE PLUGINS");
  console.log(Object.keys(config.plugins || {}));

  printSection("PARSER");
  console.log(config.parser);

  printSection("PARSER OPTIONS");
  console.log(JSON.stringify(config.parserOptions, null, 2));

  printSection("ACTIVE RULES (non-off)");
  const activeRules = getActiveRules(config);
  console.log(activeRules.sort().join("\n"));

  printSection("TYPE-AWARE RULES (if any)");
  const typeAwareRules = getTypeAwareRules(activeRules);
  console.log(typeAwareRules.length > 0 ? typeAwareRules.join("\n") : "None found");
}

await debugESLint();
