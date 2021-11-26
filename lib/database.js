var sqlite3 = require('sqlite3')

var database, callFunc;

exports.Config = function (config){

	const _db = {
		init: function(){
			callFunc = this
			switch(config.type){
				case "sqlite":
					database = new sqlite3.Database(config.database, sqlite3.OPEN_READWRITE, (err) => {
						if (err) {
						  console.error(err.message);
						}
						//console.log('Connected to the '+ config.database +' database sqlite.');
					});

				break;
			}

			return this;
		},
		select: function($table, $join=null, $columns=null, $where=null, $callback=null){

			const regexpTable = /([a-zA-Z0-9_\-\.]+)([.*?(])([(a-zA-Z0-9_\-\.)]+)([.*?)])/ig;
			const arrayTable = [...$table.matchAll(regexpTable)][0];
			$tableIns = $table
			if(Object.prototype.toString.call(arrayTable) === '[object Array]' && arrayTable.length >= 1){
				$table = arrayTable[3]
				$tableIns = arrayTable[1]+' AS '+arrayTable[3]
			}

			//RESOLVE JOIN
			if(Object.prototype.toString.call($join) === '[object Object]'){
				//JOIN is join
				$join = $join
				
				if(Object.prototype.toString.call($callback) === '[object Function]'){
					$callback = $callback
				}else{
					$callback = $where
				}

				if(typeof $columns[0] != undefined && Object.prototype.toString.call($columns[0]) === '[object Object]'){
					$callback = $where
					$where = $columns
					$columns = '*'
				}else if(Object.prototype.toString.call($columns) === '[object Function]'){
					$callback = $columns
					$columns = '*'
				}

				console.log('JOIN is join')
			}else if(Object.prototype.toString.call($join) === '[object Array]' && Object.prototype.toString.call($join[0]) != '[object Object]' || typeof $join === 'string' || $join instanceof String){
				//JOIN is columns

				$callback = $where
				if(Object.prototype.toString.call($columns) === '[object Function]'){
					$callback = $columns
				}else if(typeof $columns[0] != undefined && Object.prototype.toString.call($columns[0]) === '[object Object]'){
					$where = $columns
				}
				
				$columns = $join
				$join=null
				console.log('JOIN is columns')

			}else if(typeof $join[0] != undefined && Object.prototype.toString.call($join[0]) === '[object Object]'){
				//JOIN is where
				$callback = $columns
				$columns = '*'
				$where = $join
				$join=null
				console.log('JOIN is where')
			}else if(Object.prototype.toString.call($join) === '[object Function]'){
				//JOIN is callback
				$callback = $join
				$columns = '*'
				console.log('JOIN is callback')
			}



			//JOIN
			var itemJoin='',
			queryJoin=' '
			if($join != null){
				Object.entries($join).forEach((v, k) => {

					const regexpJoin = /([[>|<|<>|><]+])([a-zA-Z0-9_\-\.]+)/ig;
					let result = [...v[0].matchAll(regexpJoin)][0]
					//console.log(result)
					switch(result[1]){
						//LEFT JOIN
						case '[>]':
							itemJoin='LEFT JOIN'
						break;
						//RIGHT JOIN
						case '[<]':
							itemJoin='RIGHT JOIN'
						break;
						//FULL JOIN
						case '[<>]':
							itemJoin='FULL JOIN'
						break;
						//INNER JOIN
						case '[><]':
							itemJoin='INNER JOIN'
						break;
					}
					var tableJoin=result[2],
					tableJoinIns=result[2]

					const regexpTableJoin = /([a-zA-Z0-9_\-\.]+)([.*?(])([(a-zA-Z0-9_\-\.)]+)([.*?)])/ig;
					const arrayTableJoin = [...v[0].matchAll(regexpTableJoin)][0];
					if(Object.prototype.toString.call(arrayTableJoin) === '[object Array]' && arrayTableJoin.length >= 1){
						tableJoin = arrayTableJoin[3]
						tableJoinIns = arrayTableJoin[1]+' AS '+arrayTableJoin[3]
					}
					queryJoin += itemJoin+' '+tableJoinIns+' ON '
					//LEFT JOIN "account" ON "post"."author_id" = "account"."user_id"
					var queryJoinUnion=[]
					Object.entries(v[1]).forEach((vl, ks) => {
						var queryJoinItem=''
						vl.forEach((vk, kv) => {
							

							if(kv === 0){
								var stVk=$table+'.'+vk+'='
								//queryJoin+=$table+'.'+vk+'='
								if(vk.indexOf('.') != -1){
									stVk = vk+'='
								}
								queryJoinItem+=stVk
							}else{
								var stVk=tableJoin+'.'+vk+' '
								if(vk.indexOf('.') != -1){
									stVk = vk+' '
								}
								//queryJoin+=tableJoin+'.'+vk+' '
								queryJoinItem+=stVk
							}
						})
						queryJoinUnion.push(queryJoinItem)
					})
					queryJoin += queryJoinUnion.join('AND ')
					//console.log(queryJoinUnion)
				})
			}

			console.log(queryJoin)



			//WHERE
			var where = '';
			if($where != null && Object.prototype.toString.call($where) != '[object Function]'){
				where += 'WHERE ';
				var whereArr = [];
				var itemArr = [];
				Object.entries($where[0]).forEach((v, k) => {

					var keyOperVal = '';
					var operator;
					v.forEach((value, key) => {
						
						//colum table
						if(key == 0){
							let pattern = /([a-zA-Z0-9_\-\.]+)([[=|>|<|!=|>=|<=|~]+])/ig
							let result = [...value.matchAll(pattern)][0]

							if(Object.prototype.toString.call(result) === '[object Array]'){
								keyOperVal += (typeof result[1] != "undefined") ? result[1] : null
								operator = result[2].replace('[', '')
											.replace(']', '')
											.replace('===', '=')
											.replace('==', '=')
								if(operator != '~'){
									keyOperVal += operator
								}
							}else{
								
								switch(value){
									case 'ORDER':
										operator='ORDER'
										keyOperVal += 'ORDER BY '
									break;
									case 'LIMIT':
										operator='LIMIT'
										keyOperVal += 'LIMIT '
									break;
									case 'GROUP':
										operator='GROUP'
										keyOperVal += 'GROUP BY '
									break;
									case 'HAVING':
										operator='HAVING'
										keyOperVal += 'HAVING '
									break;
								}
							}
							
						}
						//value
						if(key == 1){
							var item='';
							
							if (typeof value === 'string' || value instanceof String || typeof value === 'number' || value instanceof Number){
								if(operator == '~'){
									item = " LIKE '%"+value+"%'"
								}else if(operator == 'ORDER' || operator == 'LIMIT' || operator == 'GROUP'){
									item = value
								}else{
									item = "'"+value+"'"
								}
							}else if(Object.prototype.toString.call(value) === '[object Array]'){
								var arrOrder = []
								value.forEach((sitem, ks) => {
									if(operator === '~'){
										//item += " LIKE '%"+sitem+"%'"
										itemArr.push(" LIKE '%"+sitem+"%'")
										item = itemArr.join(' OR '+ keyOperVal)
									}else if(operator === 'ORDER' || operator === 'LIMIT' || operator === 'GROUP'){
										
										if (typeof sitem === 'string' || sitem instanceof String || typeof sitem === 'number' || sitem instanceof Number){

											arrOrder.push(sitem)
										}else if(Object.prototype.toString.call(sitem) === '[object Object]'){
											Object.entries(sitem).forEach((sit, kes) => {
												arrOrder.push(sit.join(' '))
											})
										}
										item = arrOrder.join(', ')
									}
									
								})
							}else if(Object.prototype.toString.call(value) === '[object Object]'){
								var arrOrder = [],
								operhaving='',
								havingUni=''
								Object.entries(value)[0].forEach((sitem, kes) => {
									if(operator === 'ORDER'){
										arrOrder.push(sitem.join(' '))
									}else if(operator === 'HAVING'){
										//console.log(sitem+' '+ kes )
										if(kes == 0){
											let pattern = /([a-zA-Z0-9_\-\.]+)([[=|>|<|!=|>=|<=|~]+]):(COUNT)/ig
											let result = [...sitem.matchAll(pattern)][0]
											if(result[3] != undefined){
												havingUni += result[3]+'('+result[1]+')'
											}else{
												havingUni += result[1]
											}
											
											operhaving = result[2].replace('[', '')
																.replace(']', '')
																.replace('===', '=')
																.replace('==', '=')
											havingUni += operhaving
										}
										if(kes == 1){
											havingUni += sitem

											arrOrder.push(havingUni)
										}

										
									}
								})
								item = arrOrder.join(', ')
							}

							keyOperVal += (typeof item != "undefined") ? item : ''
							
							whereArr.push(keyOperVal)


						}

					})

				})

				where += whereArr.join(' AND ').replace('AND ORDER', 'ORDER').replace('AND LIMIT', 'LIMIT').replace('AND HAVING', 'HAVING')
				where = where.replace('WHERE ORDER BY', 'ORDER BY')
						.replace('WHERE GROUP BY', 'GROUP BY')
						.replace('WHERE HAVING', 'HAVING')
			}

			//callFunc.log(where)


			//COLUMNS
			var columns = []
			if(typeof $columns === 'string' || $columns instanceof String){
				columns = $columns
			}else if(Object.prototype.toString.call($columns) === '[object Array]'){
				
				$columns.forEach((item) => {
					const regexpColumns = /([a-zA-Z0-9_\-\.]+)([.*?(])([(a-zA-Z0-9_\-\.)]+)([.*?)])/ig;
					const arrColumn = [...item.matchAll(regexpColumns)][0];
					keyColumn = item

					if(Object.prototype.toString.call(arrColumn) === '[object Array]' && arrColumn != undefined){
						if(arrColumn[3].indexOf(')(') > -1){
							var splArr = arrColumn[3].replace(')(', ') AS ')
							keyColumn = arrColumn[1]+'('+splArr
						}else{
							keyColumn = arrColumn[1]+' AS '+arrColumn[3]
						}
						
					}
					
					columns.push(keyColumn)
				})
				//callFunc.log(columns)
				columns = columns.join(', ')
			}

			//GERATE QUERY
			var query = 'SELECT '+columns+' FROM '+$tableIns+queryJoin+where

			var res=[]
			database.serialize(() => {

				database.each(query, (error, row) => {
					if (error) throw error
					// [1]
					res.push(row)

				}, function(){
					callFunc.closeConnection()
					$callback(res)
				});
				//return res;
			});

			callFunc.log(query)

			

		},
		closeConnection: function(){
			database.close((err) => {
			  if (err) {
			    console.error(err.message);
			  }
			  //console.log('Close the database connection.');
			});
		},
		log: function(data){
			console.log('===========================================')
			console.log("=================DEBUG=====================\n")
			console.log("> "+data)
		}
	}

	const initDb = Object.create(_db);
    //iniciar
    return initDb.init(config);
}