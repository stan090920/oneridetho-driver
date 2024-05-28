import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { getCookie } from 'cookies-next';

const withAdminAuth = (WrappedComponent: React.ComponentType) => {
  const AdminAuth = (props: any) => {
    const router = useRouter();

    useEffect(() => {
      const checkAdminAuth = async () => {
        try {
          const token = getCookie('admin-token');
          if (!token) {
            throw new Error('No token');
          }

          const response = await axios.get('/api/admin/check-auth', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.status !== 200) {
            throw new Error('Invalid token');
          }
        } catch (error) {
          router.push('/AdminLogin');
        }
      };

      checkAdminAuth();
    }, [router]);

    return <WrappedComponent {...props} />;
  };

  return AdminAuth;
};

export default withAdminAuth;
