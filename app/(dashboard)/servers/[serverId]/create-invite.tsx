import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';

export function CreateInvite({ serverId }: { serverId: Id<'servers'> }) {
  const [inviteId, setInviteId] = useState<Id<'invites'> | null>(null);
  const createInvite = useMutation(api.functions.invite.create);

  const handleSubmit = async (
    maxUses: number | undefined,
    expiresAt: number | undefined
  ) => {
    try {
      const inviteId = await createInvite({ serverId, maxUses, expiresAt });
      setInviteId(inviteId);
    } catch (err) {
      toast.error('Failed to create invite', {
        description:
          err instanceof Error ? err.message : 'An unknown error occurred',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Create Invite
        </Button>
      </DialogTrigger>
      {inviteId ? (
        <CreatedInvite invitedId={inviteId} onClose={() => setInviteId(null)} />
      ) : (
        <CreateInviteForm onSubmit={handleSubmit} />
      )}
    </Dialog>
  );
}

const EXPIRES_AT_OPTIONS = [
  { label: 'Never', value: 0 },
  { label: '1 Hour', value: 1 },
  { label: '6 Hours', value: 6 },
  { label: '12 Hours', value: 12 },
  { label: '24 Hours', value: 24 },
  { label: '3 Days', value: 72 },
  { label: '7 Days', value: 168 },
];

const MAX_USES_OPTIONS = [
  { label: 'Unlimited', value: 0 },
  { label: '1 Use', value: 1 },
  { label: '5 Uses', value: 5 },
  { label: '10 Uses', value: 10 },
  { label: '25 Uses', value: 25 },
  { label: '50 Uses', value: 50 },
  { labe: '100 Uses', value: 100 },
];

function CreateInviteForm({
  onSubmit,
}: {
  onSubmit: (
    maxUses: number | undefined,
    expiresAt: number | undefined
  ) => void;
}) {
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const parseNumber = (str: string) => {
    const value = parseInt(str);
    if (!value) {
      return undefined;
    }
    return value;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedMaxUses = parseNumber(maxUses);
    const parsedExpiresAt = parseNumber(expiresAt);
    onSubmit(
      parsedMaxUses,
      parsedExpiresAt
        ? Date.now() + parsedExpiresAt * 60 * 60 * 1000
        : undefined
    );
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Invite</DialogTitle>
      </DialogHeader>
      <form className="contents" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="expiresAt">Expires At</Label>
          <Select value={expiresAt} onValueChange={setExpiresAt}>
            <SelectTrigger>
              <SelectValue placeholder="Select expiration" />
            </SelectTrigger>
            <SelectContent>
              {EXPIRES_AT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxUses">Max Uses</Label>
          <Select value={maxUses} onValueChange={setMaxUses}>
            <SelectTrigger>
              <SelectValue placeholder="Select expiration" />
            </SelectTrigger>
            <SelectContent>
              {MAX_USES_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button>Create Invite</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function CreatedInvite({
  invitedId,
  onClose,
}: {
  invitedId: Id<'invites'>;
  onClose: () => void;
}) {
  const url = new URL(`/join/${invitedId}`, window.location.href).toString();

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Invite Created</DialogTitle>
        <DialogDescription>
          You can send this link to your friends.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label>Invite Link</Label>
        <Input
          className="w-full p-2 bg-gray-100 rounded"
          value={url}
          readOnly
        />
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Back
        </Button>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(url);
            toast.success('Copied invite URL');
          }}
        >
          Copy
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
