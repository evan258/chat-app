"use client";

import { store } from "@/state/store";
import { Provider } from "react-redux"
import InitialData from "@/components/InitialData";
import RefreshUrls from "@/components/RefreshUrls";

const Providers = ({children} : {children: React.ReactNode}) => {
  return (
    <Provider store={store}>
      <InitialData />
      <RefreshUrls />
      {children}
    </Provider>
  )
}

export default Providers
