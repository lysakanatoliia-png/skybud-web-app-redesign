import {toast, Bounce} from 'react-toastify';
import React from 'react';
import { SwipeableToast } from '../components/ui/SwipeableToast';

export const toastSuccess = (message: string) => {
  toast.dismiss();
  toast.success((props: any) => React.createElement(SwipeableToast, { ...props, message }), {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    theme: "dark",
    transition: Bounce,
  });
};

export const toastError = (message: string) => {
  toast.dismiss();
  toast.error((props: any) => React.createElement(SwipeableToast, { ...props, message }), {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    theme: "dark",
    transition: Bounce,
  });
};
