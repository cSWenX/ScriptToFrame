import '../styles/globals.css';
import '../styles/storybook.css';
// import '../styles/cyber.css'; // 已弃用 - 赛博朋克风格

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp;