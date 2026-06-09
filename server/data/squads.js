// World Cup Squads Data
// positions: GK, RB, CB, LB, CDM, CM, CAM, RM, LM, RW, LW, ST, CF
// ratings: 1-99

const squads = {
  "Brazil_1970": {
    country: "Brazil", year: 1970, flag: "🇧🇷",
    players: [
      { name: "Félix", pos: "GK", rating: 78 },
      { name: "Carlos Alberto", pos: "RB", rating: 90 },
      { name: "Brito", pos: "CB", rating: 78 },
      { name: "Piazza", pos: "CB", rating: 79 },
      { name: "Everaldo", pos: "LB", rating: 80 },
      { name: "Clodoaldo", pos: "CDM", rating: 82 },
      { name: "Gérson", pos: "CM", rating: 88 },
      { name: "Rivellino", pos: "LM", rating: 92 },
      { name: "Jairzinho", pos: "RW", rating: 93 },
      { name: "Tostão", pos: "CF", rating: 89 },
      { name: "Pelé", pos: "ST", rating: 99 },
    ]
  },
  "Germany_1974": {
    country: "Germany", year: 1974, flag: "🇩🇪",
    players: [
      { name: "Sepp Maier", pos: "GK", rating: 90 },
      { name: "Berti Vogts", pos: "RB", rating: 83 },
      { name: "Franz Beckenbauer", pos: "CB", rating: 97 },
      { name: "Hans-Georg Schwarzenbeck", pos: "CB", rating: 80 },
      { name: "Paul Breitner", pos: "LB", rating: 86 },
      { name: "Rainer Bonhof", pos: "CM", rating: 83 },
      { name: "Uli Hoeneß", pos: "CM", rating: 81 },
      { name: "Wolfgang Overath", pos: "CAM", rating: 86 },
      { name: "Jürgen Grabowski", pos: "RW", rating: 82 },
      { name: "Gerd Müller", pos: "ST", rating: 97 },
      { name: "Bernd Hölzenbein", pos: "LW", rating: 80 },
    ]
  },
  "Argentina_1978": {
    country: "Argentina", year: 1978, flag: "🇦🇷",
    players: [
      { name: "Ubaldo Fillol", pos: "GK", rating: 88 },
      { name: "Jorge Olguin", pos: "RB", rating: 77 },
      { name: "Luis Galván", pos: "CB", rating: 79 },
      { name: "Daniel Passarella", pos: "CB", rating: 89 },
      { name: "Alberto Tarantini", pos: "LB", rating: 79 },
      { name: "Osvaldo Ardiles", pos: "CM", rating: 87 },
      { name: "Américo Gallego", pos: "CDM", rating: 78 },
      { name: "Norberto Alonso", pos: "CAM", rating: 82 },
      { name: "Leopoldo Luque", pos: "RW", rating: 83 },
      { name: "Mario Kempes", pos: "ST", rating: 93 },
      { name: "René Houseman", pos: "LW", rating: 80 },
    ]
  },
  "Italy_1982": {
    country: "Italy", year: 1982, flag: "🇮🇹",
    players: [
      { name: "Dino Zoff", pos: "GK", rating: 93 },
      { name: "Claudio Gentile", pos: "RB", rating: 82 },
      { name: "Gaetano Scirea", pos: "CB", rating: 90 },
      { name: "Fulvio Collovati", pos: "CB", rating: 81 },
      { name: "Antonio Cabrini", pos: "LB", rating: 85 },
      { name: "Gabriele Oriali", pos: "CDM", rating: 79 },
      { name: "Marco Tardelli", pos: "CM", rating: 87 },
      { name: "Bruno Conti", pos: "RM", rating: 85 },
      { name: "Giancarlo Antognoni", pos: "CAM", rating: 88 },
      { name: "Francesco Graziani", pos: "CF", rating: 82 },
      { name: "Paolo Rossi", pos: "ST", rating: 92 },
    ]
  },
  "France_1984": {
    country: "France", year: 1984, flag: "🇫🇷",
    players: [
      { name: "Joël Bats", pos: "GK", rating: 82 },
      { name: "Manuel Amoros", pos: "RB", rating: 83 },
      { name: "Maxime Bossis", pos: "CB", rating: 84 },
      { name: "Patrick Battiston", pos: "CB", rating: 82 },
      { name: "Luis Fernandez", pos: "CM", rating: 82 },
      { name: "Jean Tigana", pos: "CM", rating: 87 },
      { name: "Alain Giresse", pos: "CAM", rating: 86 },
      { name: "Michel Platini", pos: "CAM", rating: 97 },
      { name: "Dominique Rocheteau", pos: "RW", rating: 83 },
      { name: "Bruno Bellone", pos: "ST", rating: 78 },
      { name: "Yannick Stopyra", pos: "ST", rating: 77 },
    ]
  },
  "Argentina_1986": {
    country: "Argentina", year: 1986, flag: "🇦🇷",
    players: [
      { name: "Nery Pumpido", pos: "GK", rating: 83 },
      { name: "Sergio Batista", pos: "RB", rating: 79 },
      { name: "Oscar Ruggeri", pos: "CB", rating: 86 },
      { name: "José Luis Brown", pos: "CB", rating: 81 },
      { name: "Julio Olarticoechea", pos: "LB", rating: 79 },
      { name: "Ricardo Giusti", pos: "CDM", rating: 79 },
      { name: "Jorge Burruchaga", pos: "CM", rating: 85 },
      { name: "Héctor Enrique", pos: "CM", rating: 79 },
      { name: "Diego Maradona", pos: "CAM", rating: 99 },
      { name: "Jorge Valdano", pos: "LW", rating: 84 },
      { name: "Claudio Caniggia", pos: "ST", rating: 88 },
    ]
  },
  "Germany_1990": {
    country: "Germany", year: 1990, flag: "🇩🇪",
    players: [
      { name: "Bodo Illgner", pos: "GK", rating: 84 },
      { name: "Thomas Berthold", pos: "RB", rating: 81 },
      { name: "Klaus Augenthaler", pos: "CB", rating: 83 },
      { name: "Jürgen Kohler", pos: "CB", rating: 87 },
      { name: "Andreas Brehme", pos: "LB", rating: 88 },
      { name: "Guido Buchwald", pos: "CDM", rating: 83 },
      { name: "Lothar Matthäus", pos: "CM", rating: 97 },
      { name: "Thomas Häßler", pos: "CM", rating: 83 },
      { name: "Rudi Völler", pos: "CF", rating: 87 },
      { name: "Jürgen Klinsmann", pos: "ST", rating: 90 },
      { name: "Pierre Littbarski", pos: "RW", rating: 83 },
    ]
  },
  "Brazil_1994": {
    country: "Brazil", year: 1994, flag: "🇧🇷",
    players: [
      { name: "Taffarel", pos: "GK", rating: 88 },
      { name: "Cafu", pos: "RB", rating: 91 },
      { name: "Aldair", pos: "CB", rating: 86 },
      { name: "Marcio Santos", pos: "CB", rating: 82 },
      { name: "Leonardo", pos: "LB", rating: 86 },
      { name: "Mauro Silva", pos: "CDM", rating: 79 },
      { name: "Mazinho", pos: "CM", rating: 79 },
      { name: "Mauro Galvão", pos: "CM", rating: 78 },
      { name: "Zinho", pos: "CAM", rating: 84 },
      { name: "Bebeto", pos: "CF", rating: 91 },
      { name: "Romário", pos: "ST", rating: 96 },
    ]
  },
  "France_1998": {
    country: "France", year: 1998, flag: "🇫🇷",
    players: [
      { name: "Fabien Barthez", pos: "GK", rating: 90 },
      { name: "Lilian Thuram", pos: "RB", rating: 89 },
      { name: "Marcel Desailly", pos: "CB", rating: 91 },
      { name: "Laurent Blanc", pos: "CB", rating: 88 },
      { name: "Bixente Lizarazu", pos: "LB", rating: 87 },
      { name: "Didier Deschamps", pos: "CDM", rating: 86 },
      { name: "Emmanuel Petit", pos: "CM", rating: 85 },
      { name: "Patrick Vieira", pos: "CM", rating: 89 },
      { name: "Zinedine Zidane", pos: "CAM", rating: 98 },
      { name: "Youri Djorkaeff", pos: "CF", rating: 86 },
      { name: "Thierry Henry", pos: "LW", rating: 90 },
    ]
  },
  "Brazil_2002": {
    country: "Brazil", year: 2002, flag: "🇧🇷",
    players: [
      { name: "Marcos", pos: "GK", rating: 84 },
      { name: "Cafu", pos: "RB", rating: 92 },
      { name: "Lúcio", pos: "CB", rating: 88 },
      { name: "Roque Júnior", pos: "CB", rating: 82 },
      { name: "Roberto Carlos", pos: "LB", rating: 93 },
      { name: "Gilberto Silva", pos: "CDM", rating: 86 },
      { name: "Kléberson", pos: "CM", rating: 78 },
      { name: "Juninho Paulista", pos: "CM", rating: 83 },
      { name: "Ronaldinho", pos: "CAM", rating: 94 },
      { name: "Rivaldo", pos: "CF", rating: 93 },
      { name: "Ronaldo", pos: "ST", rating: 98 },
    ]
  },
  "Germany_2006": {
    country: "Germany", year: 2006, flag: "🇩🇪",
    players: [
      { name: "Jens Lehmann", pos: "GK", rating: 86 },
      { name: "Philipp Lahm", pos: "LB", rating: 88 },
      { name: "Per Mertesacker", pos: "CB", rating: 83 },
      { name: "Christoph Metzelder", pos: "CB", rating: 82 },
      { name: "Arne Friedrich", pos: "RB", rating: 81 },
      { name: "Michael Ballack", pos: "CM", rating: 93 },
      { name: "Bastian Schweinsteiger", pos: "CM", rating: 86 },
      { name: "Torsten Frings", pos: "CDM", rating: 83 },
      { name: "Lukas Podolski", pos: "LW", rating: 84 },
      { name: "Miroslav Klose", pos: "ST", rating: 89 },
      { name: "Oliver Neuville", pos: "RW", rating: 79 },
    ]
  },
  "Spain_2010": {
    country: "Spain", year: 2010, flag: "🇪🇸",
    players: [
      { name: "Iker Casillas", pos: "GK", rating: 94 },
      { name: "Sergio Ramos", pos: "RB", rating: 90 },
      { name: "Carles Puyol", pos: "CB", rating: 89 },
      { name: "Gerard Piqué", pos: "CB", rating: 87 },
      { name: "Joan Capdevila", pos: "LB", rating: 82 },
      { name: "Sergio Busquets", pos: "CDM", rating: 87 },
      { name: "Xabi Alonso", pos: "CM", rating: 90 },
      { name: "Xavi", pos: "CM", rating: 95 },
      { name: "Andrés Iniesta", pos: "CAM", rating: 95 },
      { name: "David Villa", pos: "LW", rating: 90 },
      { name: "Fernando Torres", pos: "ST", rating: 87 },
    ]
  },
  "Germany_2014": {
    country: "Germany", year: 2014, flag: "🇩🇪",
    players: [
      { name: "Manuel Neuer", pos: "GK", rating: 96 },
      { name: "Philipp Lahm", pos: "RB", rating: 90 },
      { name: "Mats Hummels", pos: "CB", rating: 89 },
      { name: "Jerome Boateng", pos: "CB", rating: 88 },
      { name: "Benedikt Höwedes", pos: "LB", rating: 83 },
      { name: "Bastian Schweinsteiger", pos: "CDM", rating: 90 },
      { name: "Sami Khedira", pos: "CM", rating: 86 },
      { name: "Mesut Özil", pos: "CAM", rating: 90 },
      { name: "Thomas Müller", pos: "RW", rating: 89 },
      { name: "Miroslav Klose", pos: "ST", rating: 88 },
      { name: "Mario Götze", pos: "CF", rating: 87 },
    ]
  },
  "Argentina_2014": {
    country: "Argentina", year: 2014, flag: "🇦🇷",
    players: [
      { name: "Sergio Romero", pos: "GK", rating: 83 },
      { name: "Ezequiel Garay", pos: "CB", rating: 84 },
      { name: "Martín Demichelis", pos: "CB", rating: 82 },
      { name: "Federico Fernández", pos: "CB", rating: 80 },
      { name: "Marcos Rojo", pos: "LB", rating: 81 },
      { name: "Pablo Zabaleta", pos: "RB", rating: 84 },
      { name: "Javier Mascherano", pos: "CDM", rating: 89 },
      { name: "Lucas Biglia", pos: "CM", rating: 81 },
      { name: "Ángel Di María", pos: "RM", rating: 90 },
      { name: "Gonzalo Higuaín", pos: "ST", rating: 87 },
      { name: "Lionel Messi", pos: "CAM", rating: 99 },
    ]
  },
  "France_2018": {
    country: "France", year: 2018, flag: "🇫🇷",
    players: [
      { name: "Hugo Lloris", pos: "GK", rating: 90 },
      { name: "Benjamin Pavard", pos: "RB", rating: 83 },
      { name: "Raphaël Varane", pos: "CB", rating: 90 },
      { name: "Samuel Umtiti", pos: "CB", rating: 85 },
      { name: "Lucas Hernández", pos: "LB", rating: 84 },
      { name: "N'Golo Kanté", pos: "CDM", rating: 93 },
      { name: "Paul Pogba", pos: "CM", rating: 88 },
      { name: "Blaise Matuidi", pos: "CM", rating: 83 },
      { name: "Kylian Mbappé", pos: "RW", rating: 93 },
      { name: "Antoine Griezmann", pos: "CAM", rating: 90 },
      { name: "Olivier Giroud", pos: "ST", rating: 83 },
    ]
  },
  "Croatia_2018": {
    country: "Croatia", year: 2018, flag: "🇭🇷",
    players: [
      { name: "Danijel Subašić", pos: "GK", rating: 84 },
      { name: "Šime Vrsaljko", pos: "RB", rating: 82 },
      { name: "Dejan Lovren", pos: "CB", rating: 83 },
      { name: "Domagoj Vida", pos: "CB", rating: 83 },
      { name: "Ivan Strinić", pos: "LB", rating: 78 },
      { name: "Ivan Rakitić", pos: "CM", rating: 89 },
      { name: "Luka Modrić", pos: "CM", rating: 96 },
      { name: "Marcelo Brozović", pos: "CDM", rating: 85 },
      { name: "Ante Rebić", pos: "LW", rating: 82 },
      { name: "Ivan Perišić", pos: "RW", rating: 85 },
      { name: "Mario Mandžukić", pos: "ST", rating: 84 },
    ]
  },
  "Argentina_2022": {
    country: "Argentina", year: 2022, flag: "🇦🇷",
    players: [
      { name: "Emiliano Martínez", pos: "GK", rating: 88 },
      { name: "Nahuel Molina", pos: "RB", rating: 82 },
      { name: "Cristian Romero", pos: "CB", rating: 85 },
      { name: "Nicolás Otamendi", pos: "CB", rating: 83 },
      { name: "Nicolás Tagliafico", pos: "LB", rating: 80 },
      { name: "Rodrigo De Paul", pos: "CM", rating: 85 },
      { name: "Enzo Fernández", pos: "CM", rating: 83 },
      { name: "Alexis Mac Allister", pos: "CM", rating: 83 },
      { name: "Ángel Di María", pos: "RW", rating: 86 },
      { name: "Julián Álvarez", pos: "CF", rating: 85 },
      { name: "Lionel Messi", pos: "CAM", rating: 99 },
    ]
  },
  "France_2022": {
    country: "France", year: 2022, flag: "🇫🇷",
    players: [
      { name: "Hugo Lloris", pos: "GK", rating: 87 },
      { name: "Jules Koundé", pos: "RB", rating: 84 },
      { name: "Raphaël Varane", pos: "CB", rating: 87 },
      { name: "Dayot Upamecano", pos: "CB", rating: 83 },
      { name: "Theo Hernández", pos: "LB", rating: 85 },
      { name: "N'Golo Kanté", pos: "CDM", rating: 91 },
      { name: "Aurélien Tchouaméni", pos: "CDM", rating: 83 },
      { name: "Antoine Griezmann", pos: "CAM", rating: 88 },
      { name: "Ousmane Dembélé", pos: "RW", rating: 85 },
      { name: "Olivier Giroud", pos: "ST", rating: 83 },
      { name: "Kylian Mbappé", pos: "LW", rating: 96 },
    ]
  },
  "Brazil_2002_Subs": {
    country: "Netherlands", year: 2010, flag: "🇳🇱",
    players: [
      { name: "Maarten Stekelenburg", pos: "GK", rating: 83 },
      { name: "Gregory van der Wiel", pos: "RB", rating: 82 },
      { name: "Joris Mathijsen", pos: "CB", rating: 80 },
      { name: "John Heitinga", pos: "CB", rating: 82 },
      { name: "Giovanni van Bronckhorst", pos: "LB", rating: 85 },
      { name: "Mark van Bommel", pos: "CDM", rating: 83 },
      { name: "Nigel de Jong", pos: "CDM", rating: 82 },
      { name: "Wesley Sneijder", pos: "CAM", rating: 90 },
      { name: "Arjen Robben", pos: "RW", rating: 91 },
      { name: "Dirk Kuyt", pos: "LW", rating: 82 },
      { name: "Robin van Persie", pos: "ST", rating: 88 },
    ]
  },
  "Portugal_2022": {
    country: "Portugal", year: 2022, flag: "🇵🇹",
    players: [
      { name: "Diogo Costa", pos: "GK", rating: 84 },
      { name: "João Cancelo", pos: "RB", rating: 88 },
      { name: "Rúben Dias", pos: "CB", rating: 89 },
      { name: "Pepe", pos: "CB", rating: 83 },
      { name: "Raphaël Guerreiro", pos: "LB", rating: 84 },
      { name: "Rúben Neves", pos: "CDM", rating: 84 },
      { name: "William Carvalho", pos: "CM", rating: 81 },
      { name: "Bruno Fernandes", pos: "CAM", rating: 88 },
      { name: "Bernardo Silva", pos: "RW", rating: 89 },
      { name: "João Félix", pos: "CF", rating: 85 },
      { name: "Cristiano Ronaldo", pos: "ST", rating: 92 },
    ]
  },
  "Netherlands_2010": {
    country: "Netherlands", year: 2010, flag: "🇳🇱",
    players: [
      { name: "Maarten Stekelenburg", pos: "GK", rating: 83 },
      { name: "Gregory van der Wiel", pos: "RB", rating: 82 },
      { name: "Joris Mathijsen", pos: "CB", rating: 80 },
      { name: "John Heitinga", pos: "CB", rating: 82 },
      { name: "Giovanni van Bronckhorst", pos: "LB", rating: 85 },
      { name: "Mark van Bommel", pos: "CDM", rating: 83 },
      { name: "Nigel de Jong", pos: "CDM", rating: 82 },
      { name: "Wesley Sneijder", pos: "CAM", rating: 90 },
      { name: "Arjen Robben", pos: "RW", rating: 91 },
      { name: "Dirk Kuyt", pos: "LW", rating: 82 },
      { name: "Robin van Persie", pos: "ST", rating: 88 },
    ]
  },
  "Spain_2012": {
    country: "Spain", year: 2012, flag: "🇪🇸",
    players: [
      { name: "Iker Casillas", pos: "GK", rating: 93 },
      { name: "Álvaro Arbeloa", pos: "RB", rating: 81 },
      { name: "Sergio Ramos", pos: "CB", rating: 91 },
      { name: "Gerard Piqué", pos: "CB", rating: 89 },
      { name: "Jordi Alba", pos: "LB", rating: 86 },
      { name: "Sergio Busquets", pos: "CDM", rating: 89 },
      { name: "Xabi Alonso", pos: "CM", rating: 91 },
      { name: "Xavi", pos: "CM", rating: 96 },
      { name: "Andrés Iniesta", pos: "CAM", rating: 96 },
      { name: "David Silva", pos: "LW", rating: 90 },
      { name: "Fernando Torres", pos: "ST", rating: 85 },
    ]
  },
  "Turkey_2002": {
    country: "Turkey", year: 2002, flag: "🇹🇷",
    players: [
      { name: "Rüştü Reçber", pos: "GK", rating: 88 },
      { name: "Fatih Akyel", pos: "RB", rating: 78 },
      { name: "Bülent Korkmaz", pos: "CB", rating: 84 },
      { name: "Alpay Özalan", pos: "CB", rating: 82 },
      { name: "Ergün Penbe", pos: "LB", rating: 77 },
      { name: "Tugay Kerimoğlu", pos: "CDM", rating: 83 },
      { name: "Emre Belözoğlu", pos: "CM", rating: 84 },
      { name: "Yıldıray Baştürk", pos: "CAM", rating: 85 },
      { name: "Hasan Şaş", pos: "LW", rating: 84 },
      { name: "Hakan Şükür", pos: "ST", rating: 87 },
      { name: "İlhan Mansız", pos: "ST", rating: 82 },
    ]
  },
};

// Remove the duplicate key
delete squads["Brazil_2002_Subs"];

module.exports = squads;
