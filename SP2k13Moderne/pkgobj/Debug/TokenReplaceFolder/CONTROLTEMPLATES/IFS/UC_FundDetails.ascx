<%@ Assembly Name="IFS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=4bb36518cdb605fa" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="IFS" TagName="MainFooter" Src="~/_CONTROLTEMPLATES/15/IFS/UC_MainFooter.ascx" %>
<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="UC_FundDetails.ascx.cs" Inherits="IFS.ControlTemplates.UC_FundDetails" %>


<div id="fund-details">
    <asp:HiddenField runat="server" ClientIDMode="Static" ID="hidISIN" />

    <!-- #page -->
    <section id="page">
        <!-- #header -->
        <header id="header">
            <div id="header-logo">
                <a href="<%=WebUrl %>">
                    <img src="/style%20library/ifs/images/logos/logo_edr_blue.svg" alt="Edmond de Rothschild">
                </a>
            </div>

            <div id="header-content">
                <div id="header-title">
                    <h1>
                        <asp:Literal runat="server" ID="litFundLabel"></asp:Literal></h1>
                    <%if (!HasParts)
					{ %>
                    	<span class="part-name"><asp:Label runat="server" ID="lblCurrentPartOnly"></asp:Label></span>
                    <%}
                    else
                    { %>
                    <div class="dropdown funds-parts-switch">
                        <button type="button" data-toggle="dropdown">
                            <asp:Label runat="server" ID="lblCurrentPart"></asp:Label>
                        </button>
                        <ul class="dropdown-menu">
                            <asp:Repeater runat="server" ID="rptParts">
                                <ItemTemplate>
                                    <li>
                                        <a href='<%=WebUrl %>/fund-details?isin=<%#Eval("Isin") %>'>
                                            <span class="name">Part <%#Eval("Nom") %> (<%#Eval("Devise")%>)</span> -
											<span class="isin"><%#Eval("Isin")%></span>
                                        </a>
                                    </li>
                                </ItemTemplate>
                            </asp:Repeater>
                        </ul>
                    </div>
                    <%} %>

                    <ul id="header-tabs" class="fund-details-tabs hidden-xs hidden-sm">
                        <li id="vl-chart-tab"><a href="#vl-chart-block" class="icon-line-chart"><%=EvolutionVL_Label %></a></li>
                        <li id="performance-tab"><a href="#performance-block" class="icon-bar-chart"><%=Perf_Label %></a></li>
                        <li id="characteristics-tab"><a href="#characteristics-block" class="icon-list"><%=FundInformation_Label %></a></li>
                        <li id="documents-tab"><a href="#documents-block" class="icon-pdf"><%=Documentation_Label %></a></li>
                    </ul>
                </div>

            </div>

        </header>
        <!-- end #header -->

        <!-- #content -->
        <section id="content">

            <!-- #sidebar -->
            <aside id="sidebar">
                <header class="sidebar-header">
                    <a href="<%=WebUrl %>" class="link-back icon-arrow-left"><%=RetourListDesFonds_Label %></a>
                </header>

                <div class="sidebar-content">
                    <div class="vl">
                        <%=EvolutionVNI_Label %> (<asp:Literal runat="server" ID="litDateVL"></asp:Literal>)
                        <strong>
                            <asp:Literal runat="server" ID="litVL"></asp:Literal>
                            <asp:Literal runat="server" ID="litDevise"></asp:Literal>
                        </strong>
                    </div>

                    <div class="management-company">
                        <figure>
                            <asp:Image runat="server" ID="imgSocGest" />
                            <figcaption>
                                <asp:Literal runat="server" ID="litSocGestName"></asp:Literal></figcaption>
                        </figure>
                        <a runat="server" id="lnkSocGest" target="_blank" class="link"><%=SocGestLien_Label %></a>
                    </div>
                </div>

                <footer class="sidebar-footer">

                    <address>
                        <p>
                            <asp:Literal runat="server" ID="litContactTitle" Text="EDMOND DE ROTHSCHILD ASSET MANAGEMENT FR - fr"></asp:Literal>
                        </p>
                        <p>
                            <asp:Literal runat="server" ID="litContactAdresse" Text="47 rue du Faubourg Saint-Honoré<br />75008 Paris - France"></asp:Literal>
                        </p>
                        <p>
                            <asp:Literal runat="server" ID="litContactTelephone" Text="+33 1 40 17 25 25"></asp:Literal>
                        </p>
                    </address>

                    <a href="" class="btn btn-primary icon-mail"><%=Contact_Label %></a>
                </footer>
            </aside>
            <!-- end #sidebar -->

            <!-- #main -->
            <main id="main">

                <div id="vl-chart-block" class="content-block">
                    <h2>
                        <%=EvolutionVL_Label %>
                        <small><%=GraphiqueBase100_Label %>
                            <asp:Literal runat="server" ID="litLastNavUpdate"></asp:Literal></small>
                    </h2>

					<div id="export-vl-block" class="dropdown hidden-xs">
						<button id="btn-export-vl" type="button" class="btn btn-default btn-export-vl icon-excel-file" data-toggle="dropdown">
							Export
						</button>

						<div class="dropdown-menu dropdown-menu-right">
							<h3>Avertissement</h3>
							<p>You are about to download the historical data for a portfolio. Please note that past performance is not an indication of future performance and it may vary over time. They may be affected, for example, by changes in exchange rates</p>
							<button id="btn-export-vl-confirm" type="button" class="btn btn-primary btn-export-vl icon-excel-file">
								Validate
							</button>
						</div>
					</div>

					

                    <div class="highchart-wrapper" runat="server" id="divEvolutionVL">
                        <div id="evol-VL-chart">
                            <div class="loader">
                            </div>
                        </div>
                    </div>
                </div>

                <div id="performance-block" class="content-block">
                    <h2><%=Perf_Label %></h2>

                    <div id="fund-performance">
                        <div class="loader">
                        </div>
                    </div>


                    <div id="performance-chart-block">
                        <h2><%=PerformanceAnnuelle_Label %></h2>
                        <div class="highchart-wrapper" runat="server" id="divPerfPart">
                            <div id="perf-fund-chart">
                                <div class="loader">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div id="characteristics-block" class="content-block">
                    <h2><%=FundInformation_Label %></h2>

                    <div id="fund-characteristics">
                        <div class="loader">
                        </div>
                    </div>

                </div>

                <!--COMPOSANT INFORMATIONS FOND-->
                <div id="documents-block" class="content-block">
                    <h2><%=Documentation_Label %></h2>
                    <div id="fund-documents">
                        <div class="loader">
                        </div>
                    </div>
                </div>

				<IFS:MainFooter runat="server"></IFS:MainFooter>


            </main>
            <!-- end #main -->

        </section>
        <!-- end #content -->

    </section>
    <!-- end #page -->

</div>
