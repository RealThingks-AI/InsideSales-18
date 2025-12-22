import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ContactTagsManagerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  readOnly?: boolean;
}

const tagColors = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
];

export const ContactTagsManager = ({ tags, onTagsChange, readOnly = false }: ContactTagsManagerProps) => {
  const [newTag, setNewTag] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
      setNewTag('');
      setIsAdding(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTag('');
    }
  };

  const getTagColor = (index: number) => {
    return tagColors[index % tagColors.length];
  };

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-1">
        {tags.length === 0 ? (
          <span className="text-sm text-muted-foreground">No tags</span>
        ) : (
          tags.map((tag, index) => (
            <Badge key={tag} variant="secondary" className={getTagColor(index)}>
              {tag}
            </Badge>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, index) => (
          <Badge key={tag} variant="secondary" className={`${getTagColor(index)} pr-1`}>
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        
        {isAdding ? (
          <div className="flex items-center gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tag name"
              className="h-6 w-24 text-xs"
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={handleAddTag}
            >
              Add
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
        )}
      </div>
    </div>
  );
};
