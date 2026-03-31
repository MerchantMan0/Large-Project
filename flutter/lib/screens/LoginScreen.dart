import 'dart:convert';

import 'package:flutter/material.dart';

import '../utils/GlobalData.dart';
import '../utils/getAPI.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue,
      body: MainPage(),
    );
  }
}

class MainPage extends StatefulWidget {
  @override
  _MainPageState createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  String message = '';
  String newMessageText = '';

  String email = '';
  String password = '';

  void changeText() {
    setState(() {
      message = newMessageText;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 250,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    message,
                    style: TextStyle(fontSize: 14, color: Colors.black),
                  ),
                ),
              ],
            ),
            Row(
              children: <Widget>[
                Container(
                  width: 250,
                  child: TextField(
                    onChanged: (text) {
                      email = text;
                    },
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(),
                      labelText: 'Email',
                      hintText: 'Enter Your Email',
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 10),
            Row(
              children: <Widget>[
                Container(
                  width: 250,
                  child: TextField(
                    obscureText: true,
                    onChanged: (text) {
                      password = text;
                    },
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(),
                      labelText: 'Password',
                      hintText: 'Enter Your Password',
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 10),
            Row(
              children: <Widget>[
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.brown[50],
                    foregroundColor: Colors.black,
                    padding: EdgeInsets.all(8.0),
                  ),
                  onPressed: () async {
                    newMessageText = '';
                    changeText();

                    String payload = json.encode({
                      "email": email.trim(),
                      "password": password.trim(),
                    });

                    var jsonObject;

                    try {
                      //Change to server ip
                      String url = 'http://10.0.2.2:8000/auth/login';
                      String ret = await CardsData.getJson(url, payload);
                      jsonObject = json.decode(ret);
                    } catch (e) {
                      newMessageText = e.toString();
                      changeText();
                      return;
                    }

                    String? token = jsonObject["access_token"];

                    if (token == null || token.isEmpty) {
                      newMessageText =
                          jsonObject["error"] ?? "Incorrect email/password";
                      changeText();
                    } else {
                      GlobalData.token = token;
                      Navigator.pushNamed(context, '/menu');
                    }
                  },
                  child: Text(
                    'Do Login',
                    style: TextStyle(fontSize: 14),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}