import React, { useEffect, useState } from 'react'
import { over } from 'stompjs';
import SockJS from 'sockjs-client';

var stompClient = null;
const ChatRoom = () => {
  const [privateChats, setPrivateChats] = useState(new Map());
  const [publicChats, setPublicChats] = useState([]);
  const [tab, setTab] = useState("CHATROOM");
  const [userData, setUserData] = useState({
    id: '',
    username: '',
    receivername: '',
    connected: false,
    message: ''
  });
  useEffect(() => {
    console.log(userData);
  }, [userData]);

  const connect = () => {
    let Sock = new SockJS('http://localhost:8080/ws');
    stompClient = over(Sock);
    stompClient.connect({}, onConnected, onError);
  }

  const onConnected = () => {
    setUserData({ ...userData, "connected": true });
    stompClient.subscribe('/topic/messages', onMessageReceived);
    stompClient.subscribe('/user/' + userData.username + '/private', onPrivateMessage);
    userJoin();
  }

  const userJoin = () => {
    var chatMessage = {
      senderName: userData.username,
      status: "JOIN"
    };
    stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
  }

  const onMessageReceived = (payload) => {
    var payloadData = JSON.parse(payload.body);
    switch (payloadData.status) {
      case "JOIN":
        if (!privateChats.get(payloadData.senderName)) {
          privateChats.set(payloadData.senderName, []);
          setPrivateChats(new Map(privateChats));
        }
        break;
      case "MESSAGE":
        publicChats.push(payloadData);
        setPublicChats([...publicChats]);
        break;
      default:
        break;
    }
  }

  const onPrivateMessage = (payload) => {
    console.log(payload);
    var payloadData = JSON.parse(payload.body);
    if (privateChats.get(payloadData.senderName)) {
      privateChats.get(payloadData.senderName).push(payloadData);
      setPrivateChats(new Map(privateChats));
    } else {
      let list = [];
      list.push(payloadData);
      privateChats.set(payloadData.senderName, list);
      setPrivateChats(new Map(privateChats));
    }
  }

  const onError = (err) => {
    console.log(err);

  }

  const handleMessage = (event) => {
    const { value } = event.target;
    setUserData({ ...userData, "message": value });
  }
  const sendValue = () => {
    if (stompClient) {
      var chatMessage = {
        senderName: userData.username,
        message: userData.message,
        status: "MESSAGE"
      };
      console.log(chatMessage);
      stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
      setUserData({ ...userData, "message": "" });
    }
  }

  const sendPrivateValue = () => {
    if (stompClient) {
      var chatMessage = {
        senderName: userData.username,
        receiverName: tab,
        message: userData.message,
        status: "MESSAGE"
      };

      if (userData.username !== tab) {
        privateChats.get(tab).push(chatMessage);
        setPrivateChats(new Map(privateChats));
      }
      stompClient.send("/app/private-chat", {}, JSON.stringify(chatMessage));
      setUserData({ ...userData, "message": "" });
    }
  }

  // Добавление запроса в БД
  const addRequest = () => {
    if (stompClient) {

      // Парсим все выбранные checkboxes
      var checkboxes = document.getElementsByClassName('message-data-checkbox');
      var checkboxesChecked = [];
      for (var index = 0; index < checkboxes.length; index++) {
        if (checkboxes[index].checked) {
          checkboxesChecked.push(checkboxes[index].parentElement.innerText);
        }
      }

      var request = {
        message: checkboxesChecked.join('; ')
      };

      // Находим юзера юзера по имени и парсим его id (пока костыль, т.к. на бэке еще нет auth)
      fetch('http://localhost:8080/users/name?' + new URLSearchParams({ userName: tab }), { method: 'GET', mode: "cors" })
        .then(response => response.json())
        .then(response => {
          fetch('http://localhost:8080/users/' + response.id + '/requests', { method: 'POST', mode: "cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) })
            .then(response => response.json());
        });



    }
  }

  // Удаление запроса из БД
  const deleteRequest = () => {
    if (stompClient) {
      fetch('http://localhost:8080/users/name?' + new URLSearchParams({ userName: tab }), { method: 'GET', mode: "cors" })
        .then(response => response.json())
        .then(response => {
          // Берем id последнего запроса из всех requests
          fetch('http://localhost:8080/users/' + response.id + '/requests/' + response.requests.at(-1).id, { method: 'DELETE', mode: "cors" })
            .then(response => response.json())
        });

    }
  }

  // Обновление запроса в БД
  const updateRequest = () => {
    if (stompClient) {
      var checkboxes = document.getElementsByClassName('message-data-checkbox');
      var checkboxesChecked = [];
      for (var index = 0; index < checkboxes.length; index++) {
        if (checkboxes[index].checked) {
          checkboxesChecked.push(checkboxes[index].parentElement.innerText);
        }
      }

      var request = {
        message: checkboxesChecked.join('; ')
      };

      fetch('http://localhost:8080/users/name?' + new URLSearchParams({ userName: tab }), { method: 'GET', mode: "cors" })
        .then(response => response.json())
        .then(response => {
          fetch('http://localhost:8080/users/' + response.id + '/requests/' + response.requests.at(-1).id, { method: 'PUT', mode: "cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) })
            .then(response => response.json())
        });


    }
  }

  // Добавление инцидента в БД
  const addIncident = () => {
    if (stompClient) {

      var checkboxes = document.getElementsByClassName('message-data-checkbox');
      var checkboxesChecked = [];
      for (var index = 0; index < checkboxes.length; index++) {
        if (checkboxes[index].checked) {
          checkboxesChecked.push(checkboxes[index].parentElement.innerText);
        }
      }

      var request = {
        solution: checkboxesChecked.join('; ')
      };

      fetch('http://localhost:8080/users/name?' + new URLSearchParams({ userName: tab }), { method: 'GET', mode: "cors" })
        .then(response => response.json())
        .then(response => {
          fetch('http://localhost:8080/users/' + response.id + '/requests/' + response.requests.at(-1).id + '/incident', { method: 'POST', mode: "cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) })
            .then(response => response.json())
        });


    }
  }

  // Обновление инцидента в БД
  const updateIncident = () => {
    if (stompClient) {

      var checkboxes = document.getElementsByClassName('message-data-checkbox');
      var checkboxesChecked = [];
      for (var index = 0; index < checkboxes.length; index++) {
        if (checkboxes[index].checked) {
          checkboxesChecked.push(checkboxes[index].parentElement.innerText); // положим в массив выбранный checkbox
        }
      }

      var request = {
        solution: checkboxesChecked.join('; ')
      };

      fetch('http://localhost:8080/users/name?' + new URLSearchParams({ userName: tab }), { method: 'GET', mode: "cors" })
        .then(response => response.json())
        .then(response => {
          fetch('http://localhost:8080/users/' + response.id + '/requests/' + response.requests.at(-1).id + '/incident', { method: 'PUT', mode: "cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) })
            .then(response => response.json())
        });


    }
  }

  // Удаление инцидента из БД
  const deleteIncident = () => {
    if (stompClient) {
      fetch('http://localhost:8080/users/name?' + new URLSearchParams({ userName: tab }), { method: 'GET', mode: "cors" })
        .then(response => response.json())
        .then(response => {
          fetch('http://localhost:8080/users/' + response.id + '/requests/' + response.requests.at(-1).id + '/incident', { method: 'DELETE', mode: "cors", headers: { "Content-Type": "application/json" } })
            .then(response => response.json())
        });


    }
  }

  // Информация о текущем юзере
  const getUser = () => {
    if (stompClient) {
      fetch('http://localhost:8080/users/name?' + new URLSearchParams({ userName: tab }), { method: 'GET', mode: "cors" })
        .then(response => response.json())
        .then(data => console.log(data));

    }
  }

  const handleUsername = (event) => {
    const { value } = event.target;
    setUserData({ ...userData, "username": value });
  }

  const registerUser = () => {
    connect();
  }
  return (
    <div className="container">
      {userData.connected ?
        <div className="chat-box">
          <div className="member-list">
            <ul>
              <li onClick={() => { setTab("CHATROOM") }} className={`member ${tab === "CHATROOM" && "active"}`}>Chatroom</li>
              {[...privateChats.keys()].map((name, index) => (
                <li onClick={() => { setTab(name) }} className={`member ${tab === name && "active"}`} key={index}>{name}</li>
              ))}
            </ul>
          </div>
          {tab === "CHATROOM" && <div className="chat-content">
            <ul className="chat-messages">
              {publicChats.map((chat, index) => (
                <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                  {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                  {<div className="message-data">{chat.message}</div>}
                  {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}
                </li>
              ))}
            </ul>

            <div className="send-message">
              <input type="text" className="input-message" placeholder="enter the message" value={userData.message} onChange={handleMessage} />
              <button type="button" className="send-button" onClick={sendValue}>send</button>
            </div>
          </div>}
          {tab !== "CHATROOM" && <div className="chat-content">
            <ul className="chat-messages">
              <button type="button" className="send-button" onClick={addRequest}>Add request</button>
              <button type="button" className="send-button" onClick={updateRequest}>Update request</button>
              <button type="button" className="send-button" onClick={deleteRequest}>Delete request</button>
              <button type="button" className="send-button" onClick={addIncident}>Add incident</button>
              <button type="button" className="send-button" onClick={updateIncident}>Update incident</button>
              <button type="button" className="send-button" onClick={deleteIncident}>Delete incident</button>
              <button type="button" className="send-button" onClick={getUser}>Get user info</button>
              {[...privateChats.get(tab)].map((chat, index) => (
                <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                  {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                  {<div className="message-data"><label><input type="checkbox" className="message-data-checkbox" />{chat.message}</label></div>}
                  {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}
                </li>
              ))}
            </ul>

            <div className="send-message">
              <input type="text" className="input-message" placeholder="enter the message" value={userData.message} onChange={handleMessage} />
              <button type="button" className="send-button" onClick={sendPrivateValue}>send</button>
            </div>
          </div>}
        </div>
        :
        <div className="register">
          <input
            id="user-name"
            placeholder="Enter your name"
            name="userName"
            value={userData.username}
            onChange={handleUsername}
            margin="normal"
          />
          <button type="button" onClick={registerUser}>
            connect
          </button>
        </div>}
    </div>
  )
}

export default ChatRoom
