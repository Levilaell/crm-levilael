'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomDiagramNode } from './custom-node';
import { NodeToolbar } from './node-toolbar';
import { NodeEditor } from './node-editor';
import { NODE_CONFIG } from './node-config';
import type { DiagramKind, DiagramNode as CrmNode, DiagramEdge as CrmEdge, DiagramNodeType } from '@/types/crm';
import { toast } from 'sonner';

interface DiagramCanvasProps {
  leadId: string;
  kind: DiagramKind;
  initialNodes: CrmNode[];
  initialEdges: CrmEdge[];
}

const nodeTypes = Object.fromEntries(
  (Object.keys(NODE_CONFIG) as DiagramNodeType[]).map((t) => [t, CustomDiagramNode]),
);

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function DiagramCanvasInner({ leadId, kind, initialNodes, initialEdges }: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<Node>(
    initialNodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
  );
  const [edges, setEdges, onEdgesChangeRaw] = useEdgesState<Edge>(
    initialEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.type,
      animated: e.animated,
    })),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const scheduleSave = useCallback(
    (latestNodes: Node[], latestEdges: Edge[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const res = await fetch(`/api/diagrams/${leadId}/${kind}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              nodes: latestNodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
              })),
              edges: latestEdges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label,
                type: e.type,
                animated: e.animated,
              })),
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setSavedAt(new Date());
        } catch (err) {
          toast.error('Falha ao salvar diagrama', {
            description: err instanceof Error ? err.message : 'Erro',
          });
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [leadId, kind],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRaw(changes);
      setNodes((curr) => {
        scheduleSave(curr, edges);
        return curr;
      });
    },
    [edges, onNodesChangeRaw, scheduleSave, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRaw(changes);
      setEdges((curr) => {
        scheduleSave(nodes, curr);
        return curr;
      });
    },
    [nodes, onEdgesChangeRaw, scheduleSave, setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, id: genId('edge') }, eds);
        scheduleSave(nodes, next);
        return next;
      });
    },
    [nodes, scheduleSave, setEdges],
  );

  function addNode(type: DiagramNodeType) {
    const newNode: Node = {
      id: genId(type),
      type,
      position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 200 },
      data: { label: NODE_CONFIG[type].label },
    };
    const next = [...nodes, newNode];
    setNodes(next);
    scheduleSave(next, edges);
    setSelectedNodeId(newNode.id);
  }

  function updateNode(id: string, data: Partial<Record<string, unknown>>) {
    setNodes((nds) => {
      const next = nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
      scheduleSave(next, edges);
      return next;
    });
  }

  function deleteNode(id: string) {
    const nextNodes = nodes.filter((n) => n.id !== id);
    const nextEdges = edges.filter((e) => e.source !== id && e.target !== id);
    setNodes(nextNodes);
    setEdges(nextEdges);
    scheduleSave(nextNodes, nextEdges);
    setSelectedNodeId(null);
  }

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  return (
    <div className="relative h-[640px] rounded-md border overflow-hidden bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: false, style: { stroke: '#64748b' } }}
        colorMode="dark"
      >
        <Background gap={20} size={1} color="#27272a" />
        <Controls position="bottom-right" className="!bg-zinc-900 !border-zinc-700 [&>button]:!bg-zinc-900 [&>button]:!border-zinc-700 [&>button]:!text-zinc-300" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.5)"
          nodeColor="#3f3f46"
          className="!bg-zinc-900/80 !border !border-zinc-700"
        />
      </ReactFlow>

      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <NodeToolbar onAdd={addNode} />
        </div>
        <div className="text-[10px] text-muted-foreground bg-zinc-900/80 px-2 py-1 rounded">
          {saving ? 'salvando…' : savedAt ? `salvo ${savedAt.toLocaleTimeString('pt-BR')}` : ''}
        </div>
      </div>

      {selectedNode ? (
        <div className="absolute top-2 right-2 pointer-events-auto z-10">
          <NodeEditor
            node={selectedNode}
            onUpdate={(data) => updateNode(selectedNode.id, data)}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function DiagramCanvas(props: DiagramCanvasProps) {
  // Memoize a chave de remount entre diagramas
  const key = useMemo(() => `${props.leadId}-${props.kind}`, [props.leadId, props.kind]);
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner key={key} {...props} />
    </ReactFlowProvider>
  );
}
