-- =============================================================================
-- 0006_pptx_pipeline: troca geração de slides HTML por .pptx final
-- =============================================================================

-- 1. Tabela crm_slide_decks: solta a coluna HTML legada e renomeia a coluna
--    de path de armazenamento pra refletir o novo formato.
alter table crm_slide_decks drop column html_content;
alter table crm_slide_decks rename column pdf_storage_path to pptx_storage_path;

-- 2. Bucket crm_pdfs: drop policy + objects + bucket. Os HTMLs antigos não
--    são mais usados (a coluna html_content acabou de ser removida).
drop policy if exists "crm_pdfs members all" on storage.objects;
delete from storage.objects where bucket_id = 'crm_pdfs';
delete from storage.buckets where id = 'crm_pdfs';

-- 3. Bucket crm_slides: substitui o crm_pdfs, restrito a .pptx.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm_slides',
  'crm_slides',
  false,
  20971520, -- 20MB
  array['application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
on conflict (id) do nothing;

create policy "crm_slides members all" on storage.objects
  for all to authenticated
  using (bucket_id = 'crm_slides' and crm_is_member())
  with check (bucket_id = 'crm_slides' and crm_is_member());
