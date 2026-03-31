import 'package:flutter/material.dart';
import 'package:large_project/screens/LoginScreen.dart';
import 'package:large_project/screens/MenuScreen.dart';
class Routes {
  static const String LOGINSCREEN = '/login';
  static const String MENUSCREEN = '/menu';
// Define routes for pages in the app
  static Map<String, Widget Function(BuildContext)> get getroutes => {
    '/': (context) => LoginScreen(),
    LOGINSCREEN: (context) => LoginScreen(),
    MENUSCREEN: (context) => MenuScreen(),
  };
}