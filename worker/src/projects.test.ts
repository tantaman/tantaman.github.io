import { describe, test, expect } from 'vitest';
import { extractProjects } from './projects';
import { extractTasks } from './tasks';

describe('extractProjects', () => {
  test('single project', () => {
    const projects = extractProjects('#p Launch website');
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe('Launch website');
    expect(projects[0].description).toBeNull();
  });

  test('project with description', () => {
    const projects = extractProjects('#p Launch website\nQ3 goal, marketing site refresh');
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe('Launch website');
    expect(projects[0].description).toBe('Q3 goal, marketing site refresh');
  });

  test('project terminated by #t line', () => {
    const projects = extractProjects('#p Launch website\n#t Write copy');
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe('Launch website');
    expect(projects[0].description).toBeNull();
  });

  test('no projects returns empty array', () => {
    expect(extractProjects('#t just a task\nplain text')).toEqual([]);
  });

  test('a #p line terminates a preceding task description', () => {
    const tasks = extractTasks('#t Do thing\nsome notes\n#p New project');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Do thing');
    expect(tasks[0].description).toBe('some notes');
  });
});
