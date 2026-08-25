"use client";

import { store } from "@/state/store";
import { Provider } from "react-redux"

const Providers = ({children} : {children: React.ReactNode}) => {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  )
}

export default Providers
