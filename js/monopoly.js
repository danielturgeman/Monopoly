var Monopoly = {};

//Initiliazing the global variables

Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 50;
Monopoly.doubleCounter = 0;

//Initializing dice, popups, and starting the game
//The init functions provide functionality for the dice, popups and their buttons,
//As they control the entire flow of the program
Monopoly.init = function(){
    $(document).ready(function(){
        Monopoly.adjustBoardSize();
        $(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();        
    });
};

Monopoly.start = function(){
    Monopoly.showPopup("intro")
};

//Initialize dice and the click
Monopoly.initDice = function(){
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice();
        }
    });
};


Monopoly.getCurrentPlayer = function(){
    return $(".player.current-turn");
};

Monopoly.getPlayersCell = function(player){
    return player.closest(".cell");
};


Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};

//Updating money by subtracting amount dedcuted from rent or purchases
//Or getting a return from the bank..

Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    console.log(playersMoney, amount)
    console.log("money left " + playersMoney);
    if (playersMoney < 0 ){

        console.log(playersMoney);
        Monopoly.handleNoMoney(player,amount);
    }
    else{
    player.attr("data-money",playersMoney);
    player.attr("title",player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
    }
};

/*Roll dice function which "rolls" two dice and gets two results based on rolls
//Show the outcome in the CSS by first resetting the dice so they are clear every turn
and then making visible the classes that display the particular result*/
Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1 ;
    var result2 = Math.floor(Math.random() * 6) + 1 ;
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("opacity",1);
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("opacity",1);
    if (result1 == result2){
        Monopoly.doubleCounter++;

    }
    else{
        Monopoly.doubleCounter = 0;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer,"move",result1 + result2);
 
};

//Moves the player according to the amount of steps we need to take,
//The animation is set by appending the player to the next cell every 200ms
//and subtracting the amount of steps remaining, when we reach 0 steps
//we clear the setinterval function so the player stops "moving"
//and we handle the action the player must take depending on the cell it lands on

Monopoly.movePlayer = function(player,steps){
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function(){
        if (steps == 0){
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        }else{
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    },200);
};

//All the difference cases for the players dturn dependng on wat
//cell the player lands on
Monopoly.handleTurn = function(player){
   // var player = Monopoly.getCurrentPlayer();
    player.removeClass("smiley");
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);
        player.addClass("smiley");
    }
    else if(playerCell.is(".property:not(.available)") && playerCell.hasClass(player.attr("id")) ){
        player.addClass("smiley");
        Monopoly.setNextPlayerTurn();
    }else if(playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))){
         Monopoly.handlePayRent(player,playerCell);
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
    }else{
        Monopoly.setNextPlayerTurn();
    }

   /* if(player.parent().is("unavailable")){
        console.log(player.attr("id"));
        if(player.attr("id") == playerCell.is(player.attr("id"))){

       // player.addClass("unavailable");
        }
    }*/
}

//Sets the next player turn by getting current players ID and adding 1 to it
//if the double counter is not 1

Monopoly.setNextPlayerTurn = function(){

    var nextPlayerId;
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player",""));
    
    if(Monopoly.doubleCounter == 0){
     nextPlayerId = playerId + 1;
    }

    else if(currentPlayerTurn.is(".jailed")){
     nextPlayerId = playerId + 1;

    }

    //still current player turn, rolled the same value in both dice
    else{
        nextPlayerId = playerId;
    }

    if (nextPlayerId > $(".player").length){
        nextPlayerId = 1;
    }


    //Adding current turn class to the curret player which can be the same
    //player or the next one

    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    nextPlayer.addClass("current-turn");

    //if next player is removed, which happens when he is broke 
    if(nextPlayer.is(".removed")){
        Monopoly.setNextPlayerTurn();
        return;
    }

    else if (nextPlayer.is(".jailed")){
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time",currentJailTime);
        if (currentJailTime > 3){
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};

//Buying property need to calculate costs see if pkayers has enough money,
//Cell is available... binding buttons with different functionalities
//if user decides to buy need to see if he has enough and spend the money in
//handlebuy method
Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
    
};

Monopoly.handlePayRent = function(player,propertyCell){
    var playersMoney = parseInt(player.attr("data-money"));

    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);
        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.updatePlayersMoney(properyOwner,-1*currentRent);
        Monopoly.closeAndNextTurn();
    });

   //if(playersMoney >= currentRent){
   Monopoly.showPopup("pay");
     //   if(playersMoney < 0){
       //     Monopoly.handleNoMoney(player);
        //}
   //}

  // else{
    //   Monopoly.handleNoMoney(player);
   //}
   
   /*else{
       handleNoMoney();
   }*/
};


Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};

Monopoly.handleNoMoney = function (player, amount){
        console.log("no more money");

        var popup = Monopoly.getPopup("no-money");
        popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"no-money");
    });
    Monopoly.showPopup('no-money');
}


Monopoly.handleChanceCard = function(player){
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson){
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",chanceJson["action"]).attr("data-amount",chanceJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        console.log("testing the action and amount " + action + " " + amount)
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("chance");
};

Monopoly.handleCommunityCard = function(player){
    //TODO: implement this method
    console.log("landed on community card");
    var flag;
    var playersMoney = parseInt(player.attr("data-money"));
    console.log(playersMoney);
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    console.log("in loading-statE");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function(communityJson){
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",communityJson["action"]).attr("data-amount",communityJson["amount"]);
    },"json")
    .done (function() {
    console.log( "loaded perfectly" );
  });
    popup.find("button").unbind("click").bind("click",function(){
        console.log("in find state");
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        console.log("testing the action and amount " + action + " " + amount)
        
       if(action == "pay" && playersMoney < 0){
            Monopoly.handleAction(player,"no-money",amount);
       }

       else{
           Monopoly.handleAction(player,"no-money",amount);

       }


           // console.log("have more than 30 cash in community and action is jail or pay")
        //}

        //else if(playersMoney > 10){
          //  console.log("have more than 10 in community")

            //if(action == "pay"){
              //  flag = true;
                // console.log("have more than 10 in community and action is pay")

                //Monopoly.handleAction(player,action,amount);
            //}

            //else{
              //  console.log("more than 10 but action is jail");
                //Monopoly.handleNoMoney(player);
            //}
        //}

        //else{   
          //  console.log("not enough for jail or pay")
            //Monopoly.handleNoMoney(player);
        //}

    });
       //+++ if(flag)
        Monopoly.showPopup("community");
};

Monopoly.sendToJail = function(player){
    player.addClass("jailed");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};


Monopoly.getPopup = function(popupId){
    return $(".popup-lightbox .popup-page#" + popupId);
};

Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};


Monopoly.calculateProperyRent = function(propertyCost){
    return propertyCost/2;
};


Monopoly.closeAndNextTurn = function(){
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").click(function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};


//If user has enough, update his money and update the cells with the proper
//attributes, if user doesnt have enough show error msg and make a sound

Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){
        Monopoly.showErrorMsg();
        Monopoly.playSound("grenade");
    }else{
        Monopoly.updatePlayersMoney(player,propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
                    .addClass(player.attr("id"))
                    .attr("data-owner",player.attr("id"))
                    .attr("data-rent",rent);
                    Monopoly.setNextPlayerTurn();
    }
};




//handles all the cases and calls function to handle the actual use case
//each action gets handled by a different function

Monopoly.handleAction = function(player,action,amount){
    switch(action){
        case "move":
            Monopoly.movePlayer(player,amount);
             break;
        case "pay":

            Monopoly.updatePlayersMoney(player,amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
        case "no-money":
        Monopoly.removePlayerProperties(player);
        player.hide();
        player.addClass("removed");
            break;
    };
    Monopoly.closePopup();
};

Monopoly.removePlayerProperties = function(player){

    playerID = player.attr("id");
    var playerDiv = $("div." + playerID);
    playerDiv.removeClass(playerID);
    playerDiv.addClass("available");
}



Monopoly.createPlayers = function(numOfPlayers){
    var startCell = $(".go");
    for (var i=1; i<= numOfPlayers; i++){
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
    }
};


//This gets the next cell by looking at our current cell, extracting our current cells
//id attribute which is a string like cell1, then we need to replace cell with an empty
//string to just get a string of the cell number itself, and we need to parse it in order
//to actually add the id number rather than append it to another string
//So the nextcell is the current cell id + 1
//If we reach pass cell40 we are at the GO mark again and therefore we need to reset
//since the last cell is 40 and return cell1.

Monopoly.getNextCell = function(cell){
   
    var currentCellId = parseInt(cell.attr("id").replace("cell",""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40){
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};


Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player,Monopoly.moneyAtStart/(-10));
};


Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
            if(value > 0 && value <= 4){
                isValid = true;
            }

            else{
                isValid = false;
            }

            break;
    }

    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;

}

Monopoly.showErrorMsg = function(){
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
            $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};


Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
}

//close popup just fadesout the lightbox, the actual popup-pages that are displayed on it
//will be hidden in the showpopup function. first thing that happens is that they get
//reset/hidden
Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};

Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav"); 
    snd.play();
}

//Popup lightbox is the entire container/ overlay for background and popups 
//If lightbox is not displayed, popup-pages wont show regardless of whther we show
//or hide them. On the lightbox, if we dont reset previous pages and hide them,
//they will continue to show, so we need to hide previous pages and show the new ones
//and we fade in the lightbox.
Monopoly.showPopup = function(popupId){
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

Monopoly.init();
