export default function stripExtension(s: string): string {
  return s.substring(0, s.lastIndexOf('.'));
}
