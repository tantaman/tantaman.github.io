import { ProjectSwitcherRail } from './ProjectSwitcherRail';
import { ProjectView } from './ProjectView';
import { ProjectConversation } from './ProjectConversation';

// The Projects workbench: a fast list/card layer. Left = project switcher,
// center = a single project's tasks, right = its Conversation / Activity rail.
// Both `/projects` and `/projects/$id` render this; the center is an empty
// prompt until a project is selected.
export function ProjectWorkbench({ projectId }: { projectId: number | null }) {
  return (
    <div className="project-workbench">
      <ProjectSwitcherRail activeId={projectId} />
      <div className="project-workbench-main">
        {projectId == null ? (
          <div className="project-empty">
            <p>Select a project from the left, or create a new one.</p>
            <p className="project-empty-hint">
              Tip: start a thought with <code>#p</code> to capture a project as you brainstorm.
            </p>
          </div>
        ) : (
          <ProjectView id={projectId} />
        )}
      </div>
      {projectId != null && <ProjectConversation id={projectId} />}
    </div>
  );
}
