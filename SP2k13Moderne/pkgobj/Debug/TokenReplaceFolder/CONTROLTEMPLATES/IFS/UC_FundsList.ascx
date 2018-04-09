<%@ Assembly Name="IFS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=4bb36518cdb605fa" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="IFS" TagName="MainFooter" Src="~/_CONTROLTEMPLATES/15/IFS/UC_MainFooter.ascx" %>
<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="UC_FundsList.ascx.cs" Inherits="IFS.ControlTemplates.UC_FundsList" %>


<div id="funds-list">
    <!-- #page -->
    <section id="page">
        <script type="text/javascript" class="available-key-values">
            window.fundsListSearchData = <%= AvailableValuesList %>; 
        </script>

        <!-- #header -->
        <header id="header">
            <div id="header-logo">
                <a href="<%=WebUrl %>">
                    <img src="/style%20library/ifs/images/logos/logo_edr_blue.svg" alt="Edmond de Rothschild">
                </a>
            </div>

            <div id="header-content">
                <div id="header-title">
                    <h1>Fund Center</h1>
                    <p class="hidden-xs"><span class="nb-filtered-funds"><%=TotalParts %></span> <%=FondsAffichesSur_Label %> <%=TotalParts %> (<span class="nb-active-filters">0</span> <%=FiltresActives_Label %>)</p>
                </div>

                <div id="header-actions">
                    <button class="btn-filters icon-filter" type="button">
                        <span class="nb-active-filters">0</span>
                    </button>
                    <button class="btn-search icon-search" type="button"></button>
                </div>
            </div>

            <div id="header-search">
                <div class="form-group">
                    <input id="funds-list-search" type="search" placeholder="<%=RechercheParNomIsin_Placeholder %>" class="form-control" />
                    <button id="btn-reset-search" class="icon-cross" type="button"></button>
                </div>
            </div>
        </header>
        <!-- end #header -->


        <!-- #content -->
        <section id="content">

            <!-- #sidebar -->
            <aside id="sidebar" class="page-filters">

                <header class="sidebar-header">
                    <h2><%=Filtre_Label %></h2>

                    <button id="btn-reset-filters" type="button"><%=Reinitialiser_Label %> <i class="icon-cross"></i></button>
                </header>

                <div class="sidebar-content">
                    <div class="filters-group">
                        <h3><%=Devise_Label %></h3>
                        <div class="form-group checkboxes checkboxes-inline">
                            <asp:Repeater runat="server" ID="rptFilterDevises">
                                <ItemTemplate>
                                    <div class="checkbox">
                                        <label>
                                            <input type="checkbox" value="<%#Eval("Devise") %>" data-filters-group="currencies" />
                                            <%#Eval("Devise") %>
                                        </label>
                                    </div>
                                </ItemTemplate>
                            </asp:Repeater>
                        </div>
                    </div>

                    <div class="filters-group">
                        <h3><%=Funds_Label %></h3>
                        <div class="form-group checkboxes">
                            <asp:Repeater runat="server" ID="rptFilterCategories">
                                <ItemTemplate>
                                    <div class="checkbox">
                                        <label>
                                            <input type="checkbox" value="<%#Eval("IdCategorie") %>" data-filters-group="categories" />
                                            <%#Eval("Categorie") %>
                                        </label>
                                    </div>
                                </ItemTemplate>
                            </asp:Repeater>
                        </div>
                    </div>
                </div>

                <footer class="sidebar-footer visible-xs visible-sm">
                    <button class="btn btn-primary btn-filters-close"><%=Valider_Label %></button>
                </footer>

            </aside>
            <!-- end #sidebar -->

            <!-- #main -->
            <main id="main">

                <table id="funds-list-table" class="table table-hover funds-list-table">
                    <thead>
                        <tr>
                            <th class="col-expand hidden-xs" rowspan="2"></th>
                            <th class="col-name hidden-xs " rowspan="2"><%=Name_Label %></th>
                            <th class="col-isin" rowspan="2"><%=ShareType_Label %> <span class="info"><%=Isin_Label %></span></th>
                            <th class="col-vl" rowspan="2"><%=ChangeNAV_Label %><span class="info"><%=NAVDate_Label %></span></th>
                            <th class="col-yearly-perf" rowspan="2"><%=AnnualisedPerf_Label %><span class="info"><%=DateInception_Label %></span></th>
                            <th class="col-perf visible-lg" colspan="4"><%=Perf_Label %></th>
                            <th class="col-perf-ytd hidden-lg" rowspan="2"><%=PerfYTD_Label %></th>
                            <th class="col-volatility" rowspan="2"><%=Volatility3Y_Label %></th>
                            <th class="col-assets" rowspan="2"><%=ActifNet_Label %></th>
                            <th class="col-access hidden-xs" rowspan="2"><%=QuickAccess_Label %></th>
                            <th class="col-details" rowspan="2"><%=Information_Label %></th>
                        </tr>
                        <tr>
                            <th class="col-perf visible-lg"><%=PerfYTD_Label %></th>
                            <th class="col-perf visible-lg"><%=Perf1Y_Label %></th>
                            <th class="col-perf visible-lg"><%=Perf3Y_Label %></th>
                            <th class="col-perf visible-lg"><%=Perf5Y_Label %></th>
                        </tr>
                    </thead>
                    <tbody>
                        <asp:Repeater runat="server" ID="rptFunds" OnItemDataBound="RptParts_OnItemDataBound">
                            <ItemTemplate>
                                <tr class="fund-title visible-xs " data-group-id='<%# Eval("IdFonds") %>' data-filter-category='<%#Eval("IdCategorie") %>' data-isin="<%# Eval("Isin") %>" data-name="<%# Eval("Libelle") %>">
                                    <td class="col-name" colspan="14">
                                        <%# Eval("LibelleCourt") %>
                                        <i class="icon-arrow-down"></i>
                                    </td>
                                </tr>
                                <tr class="fund-main-part expandable-group" data-group-id='<%# Eval("IdFonds") %>' data-filter-category='<%#Eval("IdCategorie") %>' data-filter-currency='<%#Eval("Devise") %>' data-isin="<%# Eval("Isin") %>" data-name="<%# Eval("Libelle") %>">
                                    <td class="col-expand hidden-xs">
                                        <i class="icon-arrow-down"></i>
                                    </td>
                                    <td class="col-name hidden-xs">
                                        <span><%# Eval("LibelleCourt") %></span>
                                    </td>
                                    <td class="col-isin"><%# Eval("Isin") %></td>
                                    <td class="col-vl">
                                        <span class="val"><%# Eval("ValeurLiquidative") %> <%# Eval("Devise") %></span>
                                        <span class="info"><%# Eval("DateValeurLiquidativeFormatted") %></span>
                                    </td>
                                    <td class="col-yearly-perf">
                                        <span class="val"><%# Eval("PerformanceSIAnnualized") %></span>
                                        <span class="info"><%# Eval("DateCreationFormatted") %></span>
                                    </td>
                                    <td class="col-perf visible-lg"><span class="val"><%# Eval("PerformanceYTD") %></span></td>
                                    <td class="col-perf visible-lg"><span class="val"><%# Eval("Performance1Y") %></span></td>
                                    <td class="col-perf visible-lg"><span class="val"><%# Eval("Performance3Y") %></span></td>
                                    <td class="col-perf visible-lg"><span class="val"><%# Eval("Performance5Y") %></span></td>
                                    <td class="col-perf-ytd hidden-lg"><span class="val"><%# Eval("PerformanceYTD") %></span></td>
                                    <td class="col-volatility"><span class="val"><%# Eval("Volatility3YAnnualized") %></span></td>
                                    <td class="col-assets"><span class="val"><%# Eval("ActifNetMillion") %></span></td>
                                    <td class="col-access hidden-xs">
                                        <a href="#modal" data-enabled='<%#Eval("EnableSmartAccessEvolVL") %>' class="icon-line-chart" title="<%=EvolutionVL_Label %>" data-toggle="modal" data-tabid="vl"></a>
                                        <a href="#modal" data-enabled='<%#Eval("EnableSmartAccessPerfs") %>' class="icon-bar-chart" title="<%=Performance_Label %>" data-toggle="modal" data-tabid="perf"></a>
                                        <a href="#modal" data-enabled='True' class="icon-list" title="<%=Caracteristiques_Label %>" data-toggle="modal" data-tabid="car"></a>
                                        <a href="#modal" data-enabled='<%#Eval("EnableSmartAccessDocs") %>' class="icon-pdf" title="<%=Documentation_Label %>" data-toggle="modal" data-tabid="doc"></a>
                                    </td>
                                    <td class="col-details"><a href='<%=WebUrl %>/fund-details?isin=<%# Eval("Isin")%>' class="icon-more"><span><%=Details_Label %></span></a></td>
                                </tr>
                                <asp:Repeater runat="server" ID="rptParts">
                                    <ItemTemplate>
                                        <tr class="row-collapsed expandable-group" data-group-id='<%# Eval("IdFonds") %>' data-filter-category='<%#Eval("IdCategorie") %>' data-filter-currency='<%#Eval("Devise") %>' data-isin="<%# Eval("Isin") %>" data-name="<%# Eval("Libelle") %>">
                                            <td class="col-expand hidden-xs"><i class="icon-arrow-down"></i></td>
                                            <td class="col-name hidden-xs">
                                                <span><%# Eval("LibelleCourt") %></span>
                                            </td>
                                            <td class="col-isin"><%# Eval("Isin") %></td>
                                            <td class="col-vl">
                                                <span class="val"><%# Eval("ValeurLiquidative") %> <%# Eval("Devise") %></span>
                                                <span class="info"><%# Eval("DateValeurLiquidativeFormatted")%></span>
                                            </td>
                                            <td class="col-yearly-perf">
                                                <span class="val"><%# Eval("PerformanceSIAnnualized") %></span>
                                                <span class="info"><%# Eval("DateCreationFormatted") %></span>
                                            </td>
                                            <td class="col-perf visible-lg"><span class="val"><%# Eval("PerformanceYTD") %></span></td>
                                            <td class="col-perf visible-lg"><span class="val"><%# Eval("Performance1Y") %></span></td>
                                            <td class="col-perf visible-lg"><span class="val"><%# Eval("Performance3Y") %></span></td>
                                            <td class="col-perf visible-lg"><span class="val"><%# Eval("Performance5Y") %></span></td>
                                            <td class="col-perf-ytd hidden-lg"><span class="val"><%# Eval("PerformanceYTD") %></span></td>
                                            <td class="col-volatility"><span class="val"><%# Eval("Volatility3YAnnualized") %></span></td>
                                            <td class="col-assets"><span class="val"><%# Eval("ActifNetMillion") %></span></td>
                                            <td class="col-access hidden-xs">
                                                <a href="#modal" data-enabled='<%#Eval("EnableSmartAccessEvolVL") %>' class="icon-line-chart" title="<%=EvolutionVL_Label %>" data-toggle="modal" data-tabid="vl"></a>
                                                <a href="#modal" data-enabled='<%#Eval("EnableSmartAccessPerfs") %>' class="icon-bar-chart" title="<%=Performance_Label %>" data-toggle="modal" data-tabid="perf"></a>
                                                <a href="#modal" data-enabled='True' class="icon-list" title="<%=Caracteristiques_Label %>" data-toggle="modal" data-tabid="car"></a>
                                                <a href="#modal" data-enabled='<%#Eval("EnableSmartAccessDocs") %>' class="icon-pdf" title="<%=Documentation_Label %>" data-toggle="modal" data-tabid="doc"></a>
                                            </td>
                                            <td class="col-details"><a href='<%=WebUrl %>/fund-details?isin=<%# Eval("Isin")%>' class="icon-more"><span><%=Details_Label %></span>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </ItemTemplate>
                        </asp:Repeater>
                        <tr class="no-result" runat="server" id="trNoDataMsg" visible="false">
                            <td colspan="14"><%=NoData_Label %></td>
                        </tr>
                    </tbody>
                </table>

                <div class="container-fluid">
                    <IFS:MainFooter runat="server"></IFS:MainFooter>
                </div>



            </main>
            <!-- end #main -->

        </section>
        <!-- end #content -->

    </section>
    <!-- end #page -->

    <div class="modal fade" tabindex="-1" id="modal">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close icon-cross" data-dismiss="modal">
                    </button>
                    <h2 class="modal-title"></h2>
                </div>
                <div class="modal-body">
                    <!-- Nav tabs -->
                    <ul class="fund-details-tabs">
                        <li><a href="#vl-tab-body" id="vl-tab" class="icon-line-chart" data-toggle="tab"><%=EvolutionVL_Label %></a></li>
                        <li><a href="#perf-tab-body" id="perf-tab" class="icon-bar-chart" data-toggle="tab"><%=Performance_Label %></a></li>
                        <li><a href="#car-tab-body" id="car-tab" class="icon-list" data-toggle="tab"><%=Caracteristiques_Label %></a></li>
                        <li><a href="#doc-tab-body" id="doc-tab" class="icon-pdf" data-toggle="tab"><%=Documentation_Label %></a></li>
                    </ul>

                    <!-- Tab panes -->
                    <div class="tab-content">
                        <div class="tab-pane" id="vl-tab-body"></div>
                        <div class="tab-pane" id="perf-tab-body"></div>
                        <div class="tab-pane" id="car-tab-body"></div>
                        <div class="tab-pane" id="doc-tab-body"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>

