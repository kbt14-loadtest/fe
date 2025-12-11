import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, CloseOutlineIcon } from '@vapor-ui/icons';
import { Button, Text, Callout, IconButton, VStack, HStack } from '@vapor-ui/core';
import { useAuth } from '@/contexts/AuthContext';
import CustomAvatar from '@/components/CustomAvatar';
import { Toast } from '@/components/Toast';

const ProfileImageUpload = ({ currentImage, onImageChange }) => {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 프로필 이미지 URL 생성
  const getProfileImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return imagePath.startsWith('http') ? 
      imagePath : 
      `${process.env.NEXT_PUBLIC_API_URL}${imagePath}`;
  };

  // 컴포넌트 마운트 시 이미지 설정
  useEffect(() => {
    const imageUrl = getProfileImageUrl(currentImage);
    setPreviewUrl(imageUrl);
  }, [currentImage]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 이미지 파일 검증
      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드할 수 있습니다.');
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
      }

      setUploading(true);
      setError('');

      // 파일 미리보기 생성
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // 인증 정보 확인
      if (!user?.token) {
        throw new Error('인증 정보가 없습니다.');
      }

      // 1) 백엔드에 메타데이터 전송하여 S3 업로드용 presigned URL 요청
      const metaResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': user?.token,
          'x-session-id': user?.sessionId
        },
        body: JSON.stringify({
          contentType: file.type || 'application/octet-stream',
          fileName: file.name || 'profile-image'
        })
      });

      if (!metaResponse.ok) {
        const errorData = await metaResponse.json();
        throw new Error(errorData.message || '업로드 정보를 가져오는데 실패했습니다.');
      }

      const presignData = await metaResponse.json();
      const { presignedProfileImage, presignedImageUrl, imageKey, uploadUrl, url, fields, imageUrl, fileUrl } = presignData || {};

      // 백엔드가 문자열 presigned PUT URL만 내려주는 경우를 우선 사용
      const finalUploadUrl = presignedProfileImage || presignedImageUrl || uploadUrl || url;
      if (!finalUploadUrl) {
        throw new Error('업로드 URL을 받을 수 없습니다.');
      }

      // 2) presigned URL로 S3 직접 업로드 (POST 필드 방식 또는 PUT 방식 지원)
      if (fields) {
        // FormData POST 방식 (S3 form upload)
        const uploadForm = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
          uploadForm.append(key, value);
        });
        uploadForm.append('file', file);

        const s3Response = await fetch(finalUploadUrl, {
          method: 'POST',
          body: uploadForm
        });

        if (!s3Response.ok) {
          const errText = await s3Response.text();
          throw new Error(`S3 업로드에 실패했습니다. (${s3Response.status}) ${errText || ''}`);
        }
      } else {
        // PUT 방식 presigned URL
        const s3Response = await fetch(finalUploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream'
          },
          body: file
        });

        if (!s3Response.ok) {
          const errText = await s3Response.text();
          throw new Error(`S3 업로드에 실패했습니다. (${s3Response.status}) ${errText || ''}`);
        }
      }

      // 최종 이미지 URL 결정 (백엔드가 내려준 키 우선)
      const strippedPresignUrl = finalUploadUrl.split('?')[0]; // 쿼리 제거해 공개 URL로 사용
      let finalImageUrl =
        imageKey ||
        imageUrl ||
        fileUrl ||
        presignData?.finalUrl ||
        (fields?.key ? `${finalUploadUrl}/${fields.key}` : null) ||
        strippedPresignUrl;

      if (!finalImageUrl) {
        // 마지막 fallback: presigned 응답에 url만 있고 key가 없을 때는 업로드 URL을 그대로 사용
        finalImageUrl = finalUploadUrl;
      }
      
      // 로컬 스토리지의 사용자 정보 업데이트
      const updatedUser = {
        ...user,
        profileImage: finalImageUrl
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 부모 컴포넌트에 변경 알림
      onImageChange(finalImageUrl);

      Toast.success('프로필 이미지가 변경되었습니다.');

      // 전역 이벤트 발생
      window.dispatchEvent(new Event('userProfileUpdate'));

    } catch (error) {
      console.error('Image upload error:', error);
      setError(error.message);
      setPreviewUrl(getProfileImageUrl(currentImage));
      
      // 기존 objectUrl 정리
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      setUploading(true);
      setError('');

      // 인증 정보 확인
      if (!user?.token) {
        throw new Error('인증 정보가 없습니다.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-image`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': user?.token,
          'x-session-id': user?.sessionId
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '이미지 삭제에 실패했습니다.');
      }

      // 로컬 스토리지의 사용자 정보 업데이트
      const updatedUser = {
        ...user,
        profileImage: ''
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 기존 objectUrl 정리
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(null);
      onImageChange('');

      // 전역 이벤트 발생
      window.dispatchEvent(new Event('userProfileUpdate'));

    } catch (error) {
      console.error('Image removal error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <VStack gap="$300" alignItems="center">
      <CustomAvatar
        user={user}
        size="xl"
        persistent={true}
        showInitials={true}
        data-testid="profile-image-avatar"
      />
      
      <HStack gap="$200" justifyContent="center">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="profile-image-upload-button"
        >
          <CameraIcon />
          이미지 변경
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="fill"
            colorPalette="danger"
            onClick={handleRemoveImage}
            disabled={uploading}
            data-testid="profile-image-delete-button"
          >
            <CloseOutlineIcon />
            이미지 삭제
          </Button>
        )}
      </HStack>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
        data-testid="profile-image-file-input"
      />

      {error && (
        <Callout color="danger">
          <HStack gap="$200" alignItems="center">
            <Text>{error}</Text>
          </HStack>
        </Callout>
      )}

      {uploading && (
        <Text typography="body3" color="$hint-100">
          이미지 업로드 중...
        </Text>
      )}
    </VStack>
  );
};

export default ProfileImageUpload;