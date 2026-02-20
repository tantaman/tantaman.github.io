import { describe, test, expect } from 'vitest';
import { extractTasks } from './tasks';

describe('extractTasks', () => {
  test('single task', () => {
    const tasks = extractTasks('#t Buy groceries');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Buy groceries');
    expect(tasks[0].description).toBeNull();
  });

  test('task with description', () => {
    const tasks = extractTasks('#t Fix bug\ndetails here');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Fix bug');
    expect(tasks[0].description).toBe('details here');
  });

  test('task with multi-line description', () => {
    const tasks = extractTasks('#t Fix bug\nline one\nline two');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toBe('line one\nline two');
  });

  test('multiple tasks', () => {
    const input = '#t First task\nsome details\n#t Second task';
    const tasks = extractTasks(input);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('First task');
    expect(tasks[0].description).toBe('some details');
    expect(tasks[1].title).toBe('Second task');
    expect(tasks[1].description).toBeNull();
  });

  test('task terminated by #e line', () => {
    const tasks = extractTasks('#t Do thing\n#e today Meeting');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Do thing');
    expect(tasks[0].description).toBeNull();
  });

  test('no tasks returns empty array', () => {
    const tasks = extractTasks('just some plain text\nnothing here');
    expect(tasks).toEqual([]);
  });
});
