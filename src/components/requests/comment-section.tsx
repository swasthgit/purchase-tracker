// src/components/requests/comment-section.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Loader2, FileText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { addCommentAction } from '@/lib/requests-actions';
import type { RequestComment, UserRole } from '@/types';

interface CommentSectionProps {
  requestId: string;
  comments: RequestComment[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  onCommentAdded?: () => void;
}

export function CommentSection({
  requestId,
  comments,
  currentUserId,
  currentUserName,
  currentUserRole,
  onCommentAdded
}: CommentSectionProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [newComment, setNewComment] = useState('');

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'dc': return 'bg-blue-100 text-blue-800';
      case 'ops_manager': return 'bg-purple-100 text-purple-800';
      case 'finance': return 'bg-green-100 text-green-800';
      case 'procurement': return 'bg-orange-100 text-orange-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'dc': return 'DC';
      case 'ops_manager': return 'Ops Manager';
      case 'finance': return 'Finance';
      case 'procurement': return 'Procurement';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Comment cannot be empty" });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('requestId', requestId);
      formData.append('userId', currentUserId);
      formData.append('userName', currentUserName);
      formData.append('userRole', currentUserRole);
      formData.append('message', newComment);

      const result = await addCommentAction(null, formData);

      if (result.success) {
        toast({ title: "Comment added", description: "Your comment has been posted" });
        setNewComment('');
        if (onCommentAdded) onCommentAdded();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments & Feedback ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Comment Form */}
        <div className="space-y-3">
          <Label htmlFor="new-comment">Add a comment</Label>
          <Textarea
            id="new-comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts, ask questions, or provide updates..."
            rows={3}
            disabled={isPending}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={isPending || !newComment.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length > 0 ? (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 bg-muted/30 rounded-lg">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(comment.userName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{comment.userName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(comment.userRole)}`}>
                            {getRoleLabel(comment.userRole)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(comment.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Message */}
                    <p className="text-sm whitespace-pre-wrap break-words">{comment.message}</p>

                    {/* Attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {comment.attachments.map((file, index) => (
                          <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-background border rounded-md text-sm hover:bg-muted transition-colors"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
