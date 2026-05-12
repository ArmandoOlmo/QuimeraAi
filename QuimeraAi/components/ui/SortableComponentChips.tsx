import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import { PageSection } from '../../types/ui';

interface SortableChipProps {
  id: string;
  onRemove: (id: string) => void;
}

function SortableChip({ id, onRemove }: SortableChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/chip inline-flex items-center gap-0.5 h-[24px] pl-0.5 pr-1.5 rounded bg-q-accent/10 text-q-accent text-[10px] font-medium border ${isDragging ? 'border-q-accent shadow-lg scale-105' : 'border-q-accent/15'} hover:bg-q-accent/15 transition-all`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-q-accent/20 rounded opacity-60 hover:opacity-100 transition-opacity"
      >
        <GripVertical size={10} />
      </div>
      <span className="px-1 select-none">{id}</span>
      <button
        onClick={() => onRemove(id)}
        className="p-0.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors"
        title={`Remove ${id}`}
      >
        <X size={10} />
      </button>
    </div>
  );
}

interface SortableComponentChipsProps {
  items: PageSection[];
  onChange: (items: PageSection[]) => void;
  onRemove: (item: PageSection) => void;
}

export function SortableComponentChips({ items, onChange, onRemove }: SortableComponentChipsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as PageSection);
      const newIndex = items.indexOf(over.id as PageSection);
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items}
        strategy={rectSortingStrategy}
      >
        {items.map((item) => (
          <SortableChip key={item} id={item} onRemove={() => onRemove(item)} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
