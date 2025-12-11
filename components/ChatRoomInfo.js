import React from 'react';
import { GroupOutlineIcon } from '@vapor-ui/icons';
import { HStack, Text, Badge } from '@vapor-ui/core';
import CustomAvatar from './CustomAvatar';

const ChatRoomInfo = ({ room, connectionStatus }) => {
  const getConnectionStatus = () => {
    if (connectionStatus === 'connecting') {
      return {
        label: "연결 중...",
        color: "warning"
      };
    } else if (connectionStatus === 'connected') {
      return {
        label: "연결됨",
        color: "success"
      };
    } else {
      return {
        label: "연결 끊김",
        color: "danger"
      };
    }
  };

  const status = getConnectionStatus();
  const participants = room?.participants || [];
  const maxVisibleAvatars = 3;
  const remainingCount = Math.max(0, participants.length - maxVisibleAvatars);

  return (
    <HStack
      justifyContent="space-between"
      alignItems="center"
      width="100%"
      paddingX="$400"
      paddingY="$100"
      className="bg-surface-200 relative"
    >
      {/* 왼쪽: 참여자 아바타 + 인원수 */}
      <div className="flex items-center gap-2">
        <HStack gap="$100" alignItems="center">
          {/* 아바타 겹치기 스타일 */}
          <div className="flex -space-x-2">
            {participants.slice(0, maxVisibleAvatars).map((participant, index) => (
              <div
                key={participant._id}
                className="ring-1 rounded-full"
                style={{ zIndex: maxVisibleAvatars - index }}
              >
                <CustomAvatar
                  user={participant}
                  size="sm"
                  showInitials
                />
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="ring-1 rounded-full z-0">
                <div className="w-8 h-8 rounded-full bg-background-contrast-200 flex items-center justify-center">
                  <span className="text-xs font-medium text-foreground-hint-100">
                    +{remainingCount}
                  </span>
                </div>
              </div>
            )}
          </div>
          <HStack gap="$050" alignItems="center" className="ml-1">
            <GroupOutlineIcon className="text-foreground-hint-100" />
            <Text
              typography="body2"
              className="text-foreground-hint-100 font-medium"
            >
              {participants.length}명
            </Text>
          </HStack>
        </HStack>
      </div>

      {/* 중앙: 채팅방 제목 */}
      <Text
        typography="heading4"
        className="font-semibold text-foreground-normal-200 absolute left-1/2 transform -translate-x-1/2"
      >
        {room?.name || '채팅방'}
      </Text>

      {/* 오른쪽: 연결 상태 */}
      <Badge
        colorPalette={status.color}
        size="sm"
      >
        {status.label}
      </Badge>
    </HStack>
  );
};

export default ChatRoomInfo;
