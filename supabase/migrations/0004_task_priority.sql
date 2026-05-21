-- Adiciona prioridade (kanban de 4 colunas em /tasks) e position (ordenação manual via drag).

alter table crm_tasks
  add column if not exists priority text not null default 'medium'
    check (priority in ('urgent', 'high', 'medium', 'low')),
  add column if not exists position integer not null default 0;

create index if not exists crm_tasks_priority_position_idx
  on crm_tasks (priority, position);
