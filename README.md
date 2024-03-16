# Przelewy24-REST-API

![Alternatice](https://github.com/nexonyt/Przelewy24-REST-API/blob/main/git.png)



## Struktura

- `pay-by-button.html` - plik z przyciskiem przekierowującym od razu do płatności
- `pay-with-info.html` - plik z prostym formularzem do uzupełnienia przez klienta przekierowującym dalej do płatności
- `transactionRegister.php` - plik PHP, który wysyła żądanie rejestracji transakcji, przekazując następnie klienta na formatkę Przelewy24 do wyboru metod płatości 
- `notification-receiver.js` - endpoint podawany w żądaniu register, do przyjmowania notyfikacji z Przelewy24

## Demo
Aby zobaczyć przykład takiej integracji, przejdź na poniższą stronę i uzupełnij przykładowe dane. Jest to symulacja transakcji przeprowadzona przez Sandbox.
<https://www.nexonstudio.pl/payment>

## Jak realizowana jest transakcja?
1. Uzupełnienie danych przez klienta i wysłanie ich w żądaniu rejestracji transakcji (`transactionRegister.php`)
2. Otrzymywany zwrotnie token oraz przekazywanie klienta na formatkę Przelewy24
3. Wybór metody płatności przez klienta i opłata zamówienia
4. Przy poprawnym opłaceniu, wysłanie przez P24 notyfikacji o opłaconej transakcji
5. Odebranie przez skrypt notyfikacji, zapisanie do bazy danych (`notification-receiver.js`)
6. Wysłanie żądania weryfikacji transakcji do Przelewy24 i zaksięgwanie środków.
7. Przekazanie klienta zwrotnie na stronę podaną w żądaniu rejestracji transakcji 

### Rejestracja transakcji
Po tym gdy klient uzupełni dane i kliknie "Zapłać", następuje wysłanie żądania rejestracji transakcji w pliku `transactionRegister.php`. Takie żądanie zawiera wszystkie informacje pobrane od klienta oraz dodatkowe informacje m.in.:
- `urlReturn` - adres URL na który zostanie przekierowany klient po opłaceniu transakcji. Tutaj należy podać adres twojej strony np. z podziękowaniem za zakup.
- `urlStatus` - adres URL na który jest wysłana notyfikacja o transakcji. Tutaj należy umieścić ścieżkę na twoim serwerze, gdzie znajduje się plik `notification-receiver.js`.  


### Notyfikacja o transakcji i weryfikacja
Aby uruchomić plik `notification-receiver.js` gdy już znajdujemy się w odpowiednim folderze na hostignu należy zainstalować 7 pakietów npm:
- `npm install express`
- `npm install body-parser`
- `npm install mysql`
- `npm install crypto`
- `npm install axios`

> [!IMPORTANT]  
> Aby endpoint do odbierania notyfikacji działał prawidłowo, weryfikował transakcję oraz zapisaywał do bazy danych, należy zmienić w nim 7 parametrów.

W pliku `notification-receiver.js` należy zmienić:

- `P24_ID` - twój ID konta w systemie Przelewy24
- `P24_CRC_KEY` - twój klucz CRC
- `P24_API_KEY` - twój klucz API
Wszystkie klucze znajdują się po zalogowaniu do panelu Przelewy24 w zakładce "Moje konto", następnie "Moje dane". Poniżej znajduje się sekcja "Dane API i konfiguracja" gdzie znajdują się powyższe klucze.

Następnie w pliku `notification-receiver.js` w sekcji `4. Database Connection` należy uzupełnić dane wymagane do połączenia z Twoją bazą danych na serwrze.
- `host` - parametr hosta Twojej bazy danych (zazwyczaj localhost)
- `user` - użytkownik logujący się do bazy danych
- `password` - hasło użytkownika do bazy danych
- `database` - nazwa bazy danych 

Dodatkowo w zapytaniu SQL należy zmienić nazwę tabeli z domyślnej ustawionej `notification` na własną.

Uruchom polecenie `node notification-receiver.js` i sprawdź czy notyfikacja zostanie odebrana oraz żądanie weryfikacji wysłane. Transakcja powinna zmienić status na "Dokonana". Do potrzymania ciągłości pracy pliku polecam zainstalować menadżer procesów PM2 na serwerze. 

Pamiętaj! Aby na twoim serwerze uruchomić plik należy mieć zainstalowane pakiet node. Dodatkowo plik `notification-receiver.js` musi na Twoim serwerze działać nieprzerwanie w tle i być cały czas dostępny.

### Baza danych 
Skrypt `notification-receiver.js` po właściwym odebraniu notyfikacji, wysyła żądanie do bazy danych, gdzie umieszcza wszystkie dane o transakcji, które zostały odebrane w notyfikacji. Struktura bazy danych w której zapisywane są dane wygląda następująco:

```
+----------------+-------------------+------+-----+----------+-------------------+
| Name           | Type              | Null | Key | Default  | Extra             |
+----------------+-------------------+------+-----+----------+-------------------+
| id             | int(11)           | NO   | PRI | NULL     | auto_increment    |
| merchantId     | varchar(6)        | NO   |     | NULL     |                   |
| sessionId      | varchar(100)      | NO   |     | NULL     |                   |
| amount         | int(10)           | NO   |     | NULL     |                   |
| originAmount   | int(10)           | NO   |     | NULL     |                   |
| currency       | varchar(3)        | NO   |     | NULL     |                   |
| orderId        | bigint(255)       | NO   |     | NULL     |                   |
| methodId       | int(3)            | NO   |     | NULL     |                   |
| statement      | text              | NO   |     | NULL     |                   |
| sign           | varchar(255)      | NO   |     | NULL     |                   |
+----------------+-------------------+------+-----+----------+-------------------+
```

## Flow transakcyjne czyli przebieg transakcji
Jak przebiega proces płatności Przelewy24 na podstawie dokuementacji.
Klient w formularzu na stronie wprowadza swoje dane. Po kliknięciu zapłać dane są przekazywane do pliku, który wysyła żądanie rejestracji transakcji do Przelewy24, gdzie zwrotnie otrzymywany jest token. 

Token umieszcza się w linku `secure.przelewy24.pl/trnRequest/TOKEN` na który dalej jest przekierowany klient. W tym momencie wyświetla się formatka płatności. Klient wybiera metodę i opłaca zamówienie. Gdy Przelewy24 otrzymają informację o pozytywnej transakcji, na podany w `urlStatus` endpoint, wysyłana jest notyfikacja. Zwrotnie na notyfikację, skrypt wysyła żądanie weryfikacji transakcji oraz zapisuje dane do bazy danych. 

> [!WARNING]  
> Jeżeli notyfikacja przez skrypt nie zostanie odebrana i zwrotnie nie zostanie wysłane żądanie weryfikacji transakcji, transakcja pozostanie na statusie "Do wykorzystania". Status ten oznacza, że klient ma pełne prawo do środków i może zażądać ich zwrotu, ponieważ nie zostały one przekazane na nasze saldo. Transakcje należy zaksięgować, ponieważ środki mogą automatycznie zostać zwrócone.

Jeżeli skrypt wyśle żądanie rejestracji transakcji, transakcja zmieni status na "Dokonana". Środki zostaną przekazanę na saldo P24 oraz można przystąpić do realizacji usługi dla klienta.

Pełna dokumentacja REST Przelewy24: https://developers.przelewy24.pl/

## Wsparcie i podziękowanie
Jeżeli skorzystałeś z kodu i był dla Ciebie przydatny, chętnie przyjmę od Ciebie mały datek w postaci kawki: https://buycoffee.to/nexonyt

<a href="https://buycoffee.to/nexonyt" target="_blank"><img src="https://buycoffee.to/btn/buycoffeeto-btn-primary-outline.svg" style="width: 217px" alt="Postaw mi kawę na buycoffee.to"></a>

## Support i wszelka pomoc
W przypadku problemów z kodem lub innych błędów proszę o kontakt i zgłoszenie tego na: 
kontakt@nexonstudio.pl


