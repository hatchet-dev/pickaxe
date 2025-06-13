export function greet(name: string): string {
  return `Hello, ${name}! Welcome to {{name}}.`;
}

export function main(): void {
  const message = greet('World');
  console.log(message);
}

if (require.main === module) {
  main();
}