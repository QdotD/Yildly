import { useRef, useState, useEffect, useMemo } from 'react';
import './App.css';

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, query, where, limit, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
// import { getAnalytics } from 'firebase/analytics';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
// const analytics = getAnalytics(app);

function App() {

  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header>
        <img className="logo" src="src/assets/yildly.svg" alt="yildly company logo" />
        <SignOut />
      </header>

      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Popup was closed before authentication');
      } else {
        console.error(error);
      }
    });
  }

  return (
    <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
  )
}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => signOut(auth)}>Sign Out</button>
  )
}

function ChatRoom() {
  const dummy = useRef();
  const messagesRef = collection(firestore, 'messages');
  const [formValue, setFormValue] = useState('');
  // const [sidebarOpen, setSidebarOpen] = useState(true);

  const userMessagesQuery = query(
    messagesRef,
    where("uid", "==", auth.currentUser ? auth.currentUser.uid : 'null'),
    limit(25)
  );

  const chatbotMessagesQuery = query(
    messagesRef,
    where("uid", "==", auth.currentUser ? 'chatbot-' + auth.currentUser.uid : 'null'),
    limit(25)
  );

  const [userMessages] = useCollectionData(userMessagesQuery, { idField: 'id' });
  const [chatbotMessages] = useCollectionData(chatbotMessagesQuery, { idField: 'id' });

  const messages = useMemo(() => {
    if (userMessages && chatbotMessages) {
      let allMessages = [...userMessages, ...chatbotMessages];
      allMessages.sort((a, b) => a.createdAt - b.createdAt);
      return allMessages;
    }
    return [];  // return an empty array as the default value
  }, [userMessages, chatbotMessages]);

  console.log(messages);

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      return;
    }

    const { uid, photoURL } = auth.currentUser;

    // Store the reference to the user's message
    const userMessageRef = await addDoc(messagesRef, {
      text: formValue,
      createdAt: serverTimestamp(),
      uid,
      photoURL
    });

    const chatbotResponses = ["Hello!", "How are you?", "Nice to meet you!", "What's up?", "I'm here to chat!"];

    // Listen for updates to the user's message
    const unsubscribe = onSnapshot(userMessageRef, (doc) => {
      // Once the user's message is confirmed to exist in the database, send the chatbot's response
      if (doc.exists()) {
        const chatbotResponse = chatbotResponses[Math.floor(Math.random() * chatbotResponses.length)];

        addDoc(messagesRef, {
          text: chatbotResponse,
          createdAt: serverTimestamp(),
          uid: 'chatbot-' + uid
        });

        // Unsubscribe to avoid unnecessary costs
        unsubscribe();
      }
    });

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    if (dummy.current) {
      dummy.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);  // scroll whenever messages update

  if (!auth.currentUser) {
    // User not logged in, return early
    return <p>Please log in to view the chat room</p>;
  }

  // const toggleSidebar = () => {
  //   setSidebarOpen(!sidebarOpen);
  // };

  return (
    <>
      <div>
        {/* <button onClick={toggleSidebar}>
          {sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        </button> */}
        <main>
          {/* {sidebarOpen && ( */}
            <div className='sidebar'>
              <ChatHistory />
            </div>
          {/* )} */}
          <div className='contentContainer'>
            <div className='messageContainer'>
              {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
              <span ref={dummy}></span>
            </div>
            <form onSubmit={sendMessage}>
              <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="Ask a question here..." />
              <button className="submit" type="submit" disabled={!formValue}>Send</button>
            </form>
          </div>
        </main>

      </div>

    </>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL } = props.message;

  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';
  const chatbotMessage = uid.startsWith('chatbot-') && uid.slice(8) === auth.currentUser.uid;

  if (chatbotMessage) {
    // This is a message from the chatbot to the current user.
    return (
      <div className={`message chatbot ${chatbotMessage}`}>
        <img src={'src/assets/Y.svg'} alt='chatbot icon' />
        <p>{text}</p>
      </div>
    );
  }
  // Default rendering for user messages
  return (<>
    <div className={`message ${messageClass}`}>
      <img src={photoURL} alt='user icon' />
      <p>{text}</p>
    </div>
  </>)
}

function ChatHistory() {

  return (<>
    <div>
      <p></p>
      <p></p>
      <h1 style={{ color: "#fff" }}>Chat History</h1>
      <button className='chat-history-button'>chat 1</button>
      <button className='chat-history-button'>chat 2</button>
      <button className='chat-history-button'>chat 3</button>
      <button className='chat-history-button'>chat 4</button>
      <button className='chat-history-button'>chat 5</button>
      <button className='chat-history-button'>chat 6</button>
      <button className='chat-history-button'>chat 7</button>
      <button className='chat-history-button'>chat 8</button>
      <button className='chat-history-button'>chat 9</button>
      <button className='chat-history-button'>chat 10</button>
    </div>
  </>)
}

export default App;