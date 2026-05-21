import { requireCrmSession } from '@/lib/auth';
import { listTasks } from '@/lib/tasks';
import { listCrmUsers } from '@/lib/leads';
import { TaskList } from '@/components/tasks/task-list';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default async function TasksPage() {
  const session = await requireCrmSession();
  const users = await listCrmUsers();
  const usersById = Object.fromEntries(users.map((u) => [u.id, u.display_name]));

  const [myOpen, allOpen, doneList] = await Promise.all([
    listTasks({ assigneeId: session.crmUser.id, status: 'open' }),
    listTasks({ status: 'open' }),
    listTasks({ status: 'done' }),
  ]);

  // Filtrar minhas pendentes excluindo done
  const myList = await listTasks({ assigneeId: session.crmUser.id });
  const minePending = myList.filter((t) => t.status !== 'done');
  void myOpen;
  void allOpen;

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">{minePending.length} suas, abertas</p>
        </div>
        <CreateTaskDialog users={users} />
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">Minhas ({minePending.length})</TabsTrigger>
          <TabsTrigger value="all">Todas abertas ({(await listTasks({ status: 'open' })).length})</TabsTrigger>
          <TabsTrigger value="done">Concluídas ({doneList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <TaskList tasks={minePending} usersById={usersById} />
        </TabsContent>

        <TabsContent value="all">
          <AllTasks usersById={usersById} />
        </TabsContent>

        <TabsContent value="done">
          <TaskList tasks={doneList} usersById={usersById} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function AllTasks({ usersById }: { usersById: Record<string, string> }) {
  const tasks = await listTasks({ status: 'open' });
  return <TaskList tasks={tasks} usersById={usersById} />;
}
