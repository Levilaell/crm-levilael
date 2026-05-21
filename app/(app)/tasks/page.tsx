import { requireCrmSession } from '@/lib/auth';
import { listTasks } from '@/lib/tasks';
import { listCrmUsers } from '@/lib/leads';
import { TaskBoard } from '@/components/tasks/task-board';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default async function TasksPage() {
  const session = await requireCrmSession();
  const users = await listCrmUsers();
  const usersById = Object.fromEntries(users.map((u) => [u.id, u.display_name]));

  const [allTasks, doneList] = await Promise.all([
    listTasks(),
    listTasks({ status: 'done' }),
  ]);

  const minePending = allTasks.filter(
    (t) => t.assignee_id === session.crmUser.id && t.status !== 'done',
  );
  const allOpen = allTasks.filter((t) => t.status !== 'done');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            {minePending.length} suas, abertas — arraste pra reorganizar
          </p>
        </div>
        <CreateTaskDialog users={users} />
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">Minhas ({minePending.length})</TabsTrigger>
          <TabsTrigger value="all">Todas abertas ({allOpen.length})</TabsTrigger>
          <TabsTrigger value="done">Concluídas ({doneList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <TaskBoard tasks={minePending} usersById={usersById} users={users} />
        </TabsContent>

        <TabsContent value="all">
          <TaskBoard tasks={allOpen} usersById={usersById} users={users} />
        </TabsContent>

        <TabsContent value="done">
          <TaskBoard tasks={doneList} usersById={usersById} users={users} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
