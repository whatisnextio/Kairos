import React from &#39;react&#39;;
import ReactDOM from &#39;react-dom/client&#39;;
import &#39;./index.css&#39;; // Tailwind CSS
import App from &#39;./App&#39;;
import * as serviceWorkerRegistration from &#39;./serviceWorkerRegistration&#39;;

const root = ReactDOM.createRoot(
document.getElementById('root') as HTMLElement
);
root.render(
\<React.StrictMode\>
&lt;App /&gt;
\</React.StrictMode\>
);

serviceWorkerRegistration.register();
