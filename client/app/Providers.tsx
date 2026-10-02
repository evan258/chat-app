"use client";

import { store } from "@/state/store";
import { Provider } from "react-redux"
import InitialData from "@/components/InitialData";

const Providers = ({children} : {children: React.ReactNode}) => {
  return (
    <Provider store={store}>
      <InitialData />
      {children}
    </Provider>
  )
}

export default Providers
