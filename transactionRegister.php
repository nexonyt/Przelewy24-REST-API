<?php
if (isset($_POST['process'])) {
    function CreateToken()
    {
        //Your keys from Przelewy24 Dashboard
        define('PRZELEWY24_MERCHANT_ID', 'YOUR_MERCHANT_ID');
        define('PRZELEWY24_CRC', 'YOUR_CRC_KEY');
        define('PRZELEWY24_API_KEY', 'YOUR_API_KEY');

        //Data from the startPayment.html
        $p24_amount = $_POST['amount'];
        $p24_description = $_POST['description'];
        $p24_email = $_POST['email'];
        $p24_currency = $_POST['currency'];
        $p24_url_return = "YOUR_URL_RETURN";   //On P24_URL_STATUS customer will forwarded after the payment eg. landing page
        $p24_url_status = "URL_TO_YOUR_ENDPOINT"; //To URL status endpoint will be send a notification required to verify and save data to database by notification-receiver.js

        //Script which generate sessionID 
        $pre_sessionID = date("Y/m/d/h/m/s");
        $p24_sessionID = md5($pre_sessionID);
        
        $sign = hash('sha384', '{"sessionId":"'.$p24_sessionID.'","merchantId":'.PRZELEWY24_MERCHANT_ID.',"amount":'.$p24_amount.',"currency":"'.$p24_currency.'","crc":"'.PRZELEWY24_CRC.'"}');
        $json = [
            'merchantId' => PRZELEWY24_MERCHANT_ID,
            'posId' => PRZELEWY24_MERCHANT_ID,
            'sessionId' => $p24_sessionID,
            'amount' => $p24_amount,
            'currency' => $p24_currency,
            'description' => $p24_description,
            'regulationAccept' => false,
            'email' => $p24_email,
            'urlStatus' => $p24_url_status,
            'urlReturn' => $p24_url_return,
            'country' => 'pl',
            'language' => 'pl',
            'sign' => $sign
        ];

        $oCURL = curl_init();
        curl_setopt($oCURL, CURLOPT_POST, 1);
        curl_setopt($oCURL, CURLOPT_SSL_CIPHER_LIST, 'TLSv1');
        curl_setopt($oCURL, CURLOPT_HTTPHEADER, array("Accept: application/json"));
        curl_setopt($oCURL, CURLOPT_HTTPHEADER, array("Authorization: Basic " . base64_encode(PRZELEWY24_MERCHANT_ID . ":" . PRZELEWY24_API_KEY)));
        curl_setopt($oCURL, CURLOPT_POSTFIELDS, $json);
        curl_setopt($oCURL, CURLOPT_URL, 'https://secure.przelewy24.pl/api/v1/transaction/register');
        curl_setopt($oCURL, CURLOPT_SSL_VERIFYHOST, 2);
        curl_setopt($oCURL, CURLOPT_RETURNTRANSFER, 1);

        $response = curl_exec($oCURL);

        if ($response) {
            $enc_response = json_decode($response, true);
            $token = $enc_response["data"]["token"];
            echo "TOKEN: " . $token;
        }
        curl_close($oCURL);
 
        return $token;
    }

    $received_token = CreateToken();

    if($received_token) {
        header('Location: '.'https://secure.przelewy24.pl/trnRequest/'.$received_token);
    }
}