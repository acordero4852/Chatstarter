import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { ScrollArea } from './ui/scroll-area';
import { FunctionReturnType } from 'convex/server';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  LoaderIcon,
  MoreVerticalIcon,
  PaperclipIcon,
  SendIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useImageUpload } from '@/hooks/use-image-upload';

export function Messages({ id }: { id: Id<'directMessages' | 'channels'> }) {
  const message = useQuery(api.functions.message.list, {
    dmOrChannelId: id,
  });
  return (
    <>
      <ScrollArea className="h-full py-4">
        {message?.map((message) => (
          <MessageItem key={message._id} message={message} />
        ))}
      </ScrollArea>
      <TypingIndicator id={id} />
      <MessageInput id={id} />
    </>
  );
}

function TypingIndicator({ id }: { id: Id<'directMessages' | 'channels'> }) {
  const username = useQuery(api.functions.typing.list, { dmOrChannelId: id });

  if (!username || username.length === 0) {
    return null;
  }

  return (
    <div className="text-sm text-muted-foreground px-4 py-2">
      {username.join(', ')} is typing...
    </div>
  );
}

type Message = FunctionReturnType<typeof api.functions.message.list>[number];

function MessageItem({ message }: { message: Message }) {
  return (
    <div className="flex items-center px-4 gap-2 py-2">
      <Avatar className="size-8 border">
        {message.sender && <AvatarImage src={message.sender?.image} />}
        <AvatarFallback />
      </Avatar>
      <div className="flex flex-col mr-auto">
        <p className="text-xs text-muted-foreground">
          {message.sender?.username ?? 'Deleted User'}
        </p>
        {message.deleted ? (
          <p className="text-sm text-destructive">
            This message was deleted.{' '}
            {message.deletedReason && (
              <span>Reason: {message.deletedReason}</span>
            )}
          </p>
        ) : (
          <>
            <p className="text-sm">{message.content}</p>
            {message.attachment && (
              <Image
                src={message.attachment}
                alt="Attachment"
                width={300}
                height={300}
                className="rounded border overflow-hidden"
              />
            )}
          </>
        )}
      </div>
      <MessageActions message={message} />
    </div>
  );
}

function MessageActions({ message }: { message: Message }) {
  const user = useQuery(api.functions.user.get);
  const removeMutation = useMutation(api.functions.message.remove);

  if (!user || message.sender?._id !== user._id) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreVerticalIcon className="size-4 text-muted-foreground" />
        <span className="sr-only">Message Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => removeMutation({ id: message._id })}
        >
          <TrashIcon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageInput({ id }: { id: Id<'directMessages' | 'channels'> }) {
  const [content, setContent] = useState('');
  const sendMessage = useMutation(api.functions.message.create);
  const sendTypingIndicator = useMutation(api.functions.typing.upsert);
  const imageUpload = useImageUpload();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await sendMessage({
        dmOrChannelId: id,
        attachment: imageUpload.storageId,
        content,
      });
      setContent('');
      imageUpload.reset();
    } catch (err) {
      toast.error('Failed to send message', {
        description:
          err instanceof Error ? err.message : 'An unknown error occurred',
      });
    }
  };

  return (
    <>
      <form className="flex items-end p-4 gap-2" onSubmit={handleSubmit}>
        <Button
          type="button"
          size="icon"
          onClick={() => {
            imageUpload.open();
          }}
        >
          <PaperclipIcon />
          <span className="sr-only">Attach</span>
        </Button>
        <div className="flex flex-col flex-1 gap-2">
          {imageUpload.previewUrl && (
            <ImagePreview
              url={imageUpload.previewUrl}
              isUploading={imageUpload.isUploading}
              onDelete={imageUpload.reset}
            />
          )}
          <Input
            placeholder="Message"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={() => {
              if (content.length > 0) {
                sendTypingIndicator({ dmOrChannelId: id });
              }
            }}
          />
        </div>
        <Button size="icon">
          <SendIcon />
          <span className="sr-only">Send</span>
        </Button>
      </form>
      <input {...imageUpload.inputProps} />
    </>
  );
}

function ImagePreview({
  url,
  isUploading,
  onDelete,
}: {
  url: string;
  isUploading: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="relative size-40 overflow-hidden rounded border group">
      <Image src={url} alt="Attachment" layout="fill" objectFit="cover" />
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <LoaderIcon className="animate-spin size-8" />
        </div>
      )}
      <Button
        type="button"
        className="absolute top-1 right-1 size-5 rounded-full group-hover:opacity-100 opacity-0 transition-opacity"
        variant="destructive"
        size="icon"
        onClick={onDelete}
      >
        <XIcon />
        <span className="sr-only">Remove</span>
      </Button>
    </div>
  );
}
