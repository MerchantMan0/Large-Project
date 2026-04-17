import 'package:flutter/material.dart';
import 'package:large_project/screens/LoginScreen.dart';
import 'package:large_project/screens/MenuScreen.dart';
import 'package:large_project/screens/RegistrationScreen.dart';
import 'package:large_project/screens/LeaderboardScreen.dart';
import 'package:large_project/screens/AccountScreen.dart';
import 'package:large_project/screens/ForgotScreen.dart';
import 'package:large_project/screens/HistoryScreen.dart';
class Routes {
  static const String LOGINSCREEN = '/login';
  static const String MENUSCREEN = '/menu';
  static const String REGISTRATIONSCREEN = '/registration';
  static const String LEADERBOARDSCREEN = '/leaderboard';
  static const String ACCCOUNTSCREEN = '/account';
  static const String FORGOTSCREEN = '/forgot';
  static const String HISTORYSCREEN = '/history';
// Define routes for pages in the app
  static Map<String, Widget Function(BuildContext)> get getroutes => {
    '/': (context) => LoginScreen(),
    LOGINSCREEN: (context) => LoginScreen(),
    MENUSCREEN: (context) => MenuScreen(),
    REGISTRATIONSCREEN: (context) => RegistrationScreen(),
    LEADERBOARDSCREEN: (context) => LeaderboardScreen(),
    ACCCOUNTSCREEN: (context) => AccountScreen(),
    FORGOTSCREEN: (context) => ForgotScreen(),
    HISTORYSCREEN: (context) => HistoryScreen(),
  };
}